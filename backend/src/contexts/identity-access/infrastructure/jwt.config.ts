import { ConfigService } from "@nestjs/config";
import { JwtModuleOptions } from "@nestjs/jwt";

/** The one place that reads JWT_SECRET (M9); validated at startup (env.validation.ts). */
export function jwtSecret(config: ConfigService): string {
  return config.getOrThrow<string>("JWT_SECRET");
}

export function jwtModuleOptions(config: ConfigService): JwtModuleOptions {
  return {
    secret: jwtSecret(config),
    signOptions: {
      expiresIn: (config.get<string>("JWT_EXPIRATION") ?? "1h") as never,
    },
  };
}
