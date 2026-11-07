import { BadRequestException, Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-local";
import { AuthService } from "../../application/auth.service";

/**
 * Username-or-e-mail and password login (T116, T49), used by LocalAuthGuard
 * on POST /auth/login.
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({ usernameField: "identifier", passwordField: "password" });
  }

  // LocalAuthGuard runs before the ValidationPipe, so the input is checked here
  async validate(identifier: unknown, password: unknown) {
    if (
      typeof identifier !== "string" ||
      typeof password !== "string" ||
      identifier.length > 254 ||
      password.length > 128
    ) {
      throw new BadRequestException("Ungültige Anmeldedaten");
    }
    return await this.authService.validateCredentials(identifier, password);
  }
}
