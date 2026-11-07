import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
import { jwtSecret } from "../../../config/auth.config";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private prisma: PrismaService,
    config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // no fallback secret (M9): the app doesn't start without JWT_SECRET
      secretOrKey: jwtSecret(config),
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.users.findUnique({
      where: { user_id: payload.sub },
      include: {
        user_roles: {
          include: { roles: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    // Take the user's first role
    const primaryRole =
      user.user_roles && user.user_roles.length > 0
        ? user.user_roles[0].roles?.name?.toLowerCase()
        : "user";

    const result = {
      id: payload.sub,
      userId: payload.sub,
      username: payload.username,
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      role: payload.role || primaryRole, // Use the JWT role or the DB role
    };

    return result;
  }
}
