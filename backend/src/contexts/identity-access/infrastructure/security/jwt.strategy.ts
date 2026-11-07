import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { UserRepository } from "../../application/ports/user.repository";
import type { JwtPayload } from "../../application/auth.service";
import type { AuthenticatedUser } from "../../application/authenticated-user";
import { ConfigService } from "@nestjs/config";
import { jwtSecret } from "../jwt.config";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly users: UserRepository,
    config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // no fallback secret (M9): the app doesn't start without JWT_SECRET
      secretOrKey: jwtSecret(config),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.users.findByIdWithRoles(payload.sub);

    if (!user) {
      throw new UnauthorizedException();
    }

    // Take the user's first role
    const primaryRole =
      user.user_roles && user.user_roles.length > 0
        ? (user.user_roles[0].roles?.name?.toLowerCase() ?? "user")
        : "user";

    return {
      id: payload.sub,
      userId: payload.sub,
      username: payload.username,
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      role: payload.role || primaryRole, // Use the JWT role or the DB role
    };
  }
}
