import { Injectable, UnauthorizedException } from "@nestjs/common";
import { CreateUserDto } from "../users/dto/create-user.dto";
import * as bcrypt from "bcrypt";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../prisma/prisma.service";
import { RoleName } from "../../config/role-permissions.config";
import { BCRYPT_COST } from "../../config/auth.config";

// compared against when no account matches, so a failed login always costs one bcrypt run
const DUMMY_HASH = bcrypt.hashSync("no-such-account", BCRYPT_COST);

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}
  async register(createUserDto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      BCRYPT_COST,
    );
    const { password, ...userWithoutPassword } = createUserDto;
    const user = await this.prisma.users.create({
      data: {
        ...userWithoutPassword,
        password_hash: hashedPassword,
      },
    });

    // Assign default role: Student (role_id=2)
    try {
      const studentRole = await this.prisma.roles.findFirst({
        where: { name: RoleName.STUDENT },
      });
      const roleId = studentRole?.role_id ?? 2;
      await this.prisma.user_roles.create({
        data: { user_id: user.user_id, role_id: roleId },
      });
    } catch (error) {
      console.error(
        "Failed to assign default role during registration:",
        error,
      );
    }

    return user;
  }

  /**
   * Checks username-or-e-mail and password (T49); used by LocalStrategy.
   * The username is matched exactly first, then the e-mail address
   * case-insensitively, so the result is deterministic even if one account's
   * username equals another one's e-mail address.
   */
  async validateCredentials(identifier: string, password: string) {
    const include = { user_roles: { include: { roles: true } } };
    const user =
      (await this.prisma.users.findFirst({
        where: { username: identifier },
        include,
      })) ??
      (await this.prisma.users.findFirst({
        where: { email: { equals: identifier, mode: "insensitive" } },
        include,
      }));

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
  issueToken(user: Awaited<ReturnType<AuthService["validateCredentials"]>>) {
    // Take the user's first role (primary role)
    const primaryRole =
      user.user_roles && user.user_roles.length > 0
        ? user.user_roles[0].roles?.name?.toLowerCase()
        : "user"; // Default role

    const { password_hash, ...userWithNoPassword } = user;
    const payload = {
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

  generateJwtFromGoogleUser(googleUser: any) {
    const payload = {
      sub: googleUser.userId,
      username: googleUser.username,
      role: googleUser.role,
    };
    return this.jwtService.sign(payload);
  }

  async validateUser(userId: number) {
    return await this.prisma.users.findUnique({
      where: { user_id: userId },
    });
  }

  async setNewPassword(userId: number, newPassword: string) {
    const hashed = await bcrypt.hash(newPassword, BCRYPT_COST);
    return await this.prisma.users.update({
      where: { user_id: userId },
      data: { password_hash: hashed },
    });
  }
}
