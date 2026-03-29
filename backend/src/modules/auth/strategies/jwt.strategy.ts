import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        process.env.JWT_SECRET || "your-secret-key-change-this-in-production",
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.users.findUnique({
      where: { user_id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    return {
      id: payload.sub,
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
    };
  }
}
