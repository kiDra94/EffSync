import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import {
  Strategy,
  Profile,
  StrategyOptions,
  VerifyCallback,
} from "passport-google-oauth20";
import { AuthService } from "../../application/auth.service";

/** Google OAuth; the account rules are in AuthService.signInWithGoogle (M13). */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(private readonly auth: AuthService) {
    const options: StrategyOptions = {
      clientID: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        "http://localhost:3000/api/auth/google/callback",
      scope: ["profile", "email"],
    };
    super(options);
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    const email = profile.emails?.[0];
    try {
      const user = await this.auth.signInWithGoogle({
        googleId: profile.id,
        email: email?.value,
        emailVerified: email?.verified === true,
        firstname: profile.name?.givenName,
        lastname: profile.name?.familyName,
      });
      return done(null, user);
    } catch (error) {
      return done(error as Error, false);
    }
  }
}
