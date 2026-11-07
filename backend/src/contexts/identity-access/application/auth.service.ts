import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { CreateUserInput } from "./user-inputs";
import * as bcrypt from "bcrypt";
import { JwtService } from "@nestjs/jwt";
import { UserRepository } from "./ports/user.repository";
import { UserWithRoles } from "./ports/identity-records";
import { RoleName } from "../domain/role-permissions";
import { GHOST_USER_ID } from "../domain/ghost-user";
import { BCRYPT_COST } from "./password-hashing";
import { withoutPasswordHash } from "./public-user";

// compared against when no account matches, so a failed login always costs one bcrypt run
const DUMMY_HASH = bcrypt.hashSync("no-such-account", BCRYPT_COST);

/** The claims of an app token (signed in issueToken, read by JwtStrategy). */
export interface JwtPayload {
  sub: number;
  username: string;
  role?: string;
}

/** What GoogleStrategy reads from the Google profile. */
interface GoogleProfile {
  googleId: string;
  email?: string;
  /** Google confirmed the address; only then may it link a local account */
  emailVerified: boolean;
  firstname?: string;
  lastname?: string;
}

/** The user GoogleStrategy hands to the callback. */
export interface GoogleUser {
  userId: number;
  username: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private jwtService: JwtService,
  ) {}
  async register(createUserDto: CreateUserInput) {
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      BCRYPT_COST,
    );
    const { password, ...userWithoutPassword } = createUserDto;
    const user = await this.users.create({
      ...userWithoutPassword,
      password_hash: hashedPassword,
    });

    await this.assignDefaultRole(user.user_id);
    return withoutPasswordHash(user);
  }

  /**
   * Google sign-in (M13 step 5): the account linked to the Google id, else a
   * local account with the same verified e-mail (which gets linked if it has
   * no Google id yet), else a new user with the same default role as
   * register. An e-mail or username that another account already uses ends
   * in 409, not in a unique-constraint error.
   */
  async signInWithGoogle(profile: GoogleProfile): Promise<GoogleUser> {
    let user = await this.users.findByGoogleIdWithRoles(profile.googleId);

    if (!user && profile.email && profile.emailVerified) {
      user = await this.users.findByEmailWithRoles(profile.email);
      if (user?.google_id || user?.user_id === GHOST_USER_ID) {
        throw new ConflictException(
          "Dieses Konto ist mit einem anderen Google-Konto verknüpft",
        );
      }
      if (user) await this.users.linkGoogleId(user.user_id, profile.googleId);
    }

    if (!user) {
      const email = profile.email || `${profile.googleId}@google.oauth`;
      const taken =
        (await this.users.findByEmail(email)) ??
        (await this.users.findByUsername(email));
      if (taken) {
        throw new ConflictException(
          "Diese E-Mail-Adresse gehört bereits zu einem Konto",
        );
      }
      const created = await this.users.create({
        username: email,
        email,
        firstname: profile.firstname || "Google",
        lastname: profile.lastname || "User",
        password_hash: null,
        google_id: profile.googleId,
      });
      await this.assignDefaultRole(created.user_id);
      user = await this.users.findByIdWithRoles(created.user_id);
    }
    if (!user)
      throw new UnauthorizedException("Google-Anmeldung fehlgeschlagen");

    return {
      userId: user.user_id,
      username: user.username,
      role: (user.user_roles[0]?.roles?.name ?? RoleName.STUDENT).toLowerCase(),
    };
  }

  // Default role for new accounts: Student (role_id=2)
  private async assignDefaultRole(userId: number) {
    try {
      const studentRole = await this.users.findRoleByName(RoleName.STUDENT);
      const roleId = studentRole?.role_id ?? 2;
      await this.users.assignRole(userId, roleId);
    } catch (error) {
      console.error(
        "Failed to assign default role during registration:",
        error,
      );
    }
  }

  /**
   * Checks username-or-e-mail and password (T49); used by LocalStrategy.
   * The username is matched exactly first, then the e-mail address
   * case-insensitively, so the result is deterministic even if one account's
   * username equals another one's e-mail address.
   */
  async validateCredentials(identifier: string, password: string) {
    const user =
      (await this.users.findByUsernameWithRoles(identifier)) ??
      (await this.users.findByEmailWithRoles(identifier));

    // one message and one bcrypt run for every failure, so the answer doesn't
    // reveal which usernames or e-mail addresses exist
    const isPasswordValid = await bcrypt.compare(
      password,
      user?.password_hash ?? DUMMY_HASH,
    );
    if (!user || !user.password_hash || !isPasswordValid) {
      throw new UnauthorizedException("Ungültige Zugangsdaten");
    }
    return user;
  }

  /** Issues the app token for a user returned by validateCredentials. */
  issueToken(user: UserWithRoles) {
    // Take the user's first role (primary role)
    const primaryRole =
      user.user_roles && user.user_roles.length > 0
        ? user.user_roles[0].roles?.name?.toLowerCase()
        : "user"; // Default role

    const { password_hash, ...userWithNoPassword } = user;
    const payload: JwtPayload = {
      sub: user.user_id,
      username: user.username,
      role: primaryRole, // Add the role!
    };
    return {
      ...userWithNoPassword,
      role: primaryRole, // Also return the role in the response
      token: this.jwtService.sign(payload),
    };
  }

  generateJwtFromGoogleUser(googleUser: GoogleUser) {
    const payload: JwtPayload = {
      sub: googleUser.userId,
      username: googleUser.username,
      role: googleUser.role,
    };
    return this.jwtService.sign(payload);
  }

  async validateUser(userId: number) {
    return await this.users.findById(userId);
  }

  async setNewPassword(userId: number, newPassword: string) {
    const hashed = await bcrypt.hash(newPassword, BCRYPT_COST);
    return await this.users.updatePasswordHash(userId, hashed);
  }
}
