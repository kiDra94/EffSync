import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { AuthService, GoogleUser } from "../application/auth.service";
import { SessionService } from "../application/session.service";
import { PasswordResetService } from "../application/password-reset.service";
import type { UserWithRoles } from "../application/ports/identity-records";
import type { AuthenticatedRequest } from "./security/authenticated-request";
import type { Request, Response } from "express";
import { CreateUserDto } from "./dto/create-user.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { NewPasswordDto } from "./dto/new-password.dto";
import {
  PasswordChangeGuard,
  type PasswordChangeRequest,
} from "./security/password-change.guard";
import { JwtAuthGuard } from "./security/jwt-auth.guard";
import { LocalAuthGuard } from "./security/local-auth.guard";
import { GoogleAuthGuard } from "./security/google-auth.guard";
import { GoogleResetAuthGuard } from "./security/google-reset-auth.guard";
import { Throttle } from "@nestjs/throttler";
import { frontendUrl } from "../../../shared/application/frontend-url";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessions: SessionService,
    private readonly passwordReset: PasswordResetService,
  ) {}

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post("register")
  register(@Body() CreateUserDto: CreateUserDto) {
    return this.authService.register(CreateUserDto);
  }

  // LocalAuthGuard checks username-or-e-mail and password (T116, T49);
  // the DTO keeps the body validated and documented
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @UseGuards(LocalAuthGuard)
  @Post("login")
  async login(
    @Req() req: { user: UserWithRoles },
    @Body() _credentials: LoginDto,
  ) {
    // T51: a 15-minute access token plus a 7-day refresh token
    return {
      ...this.authService.issueToken(req.user),
      refreshToken: await this.sessions.start(req.user.user_id),
    };
  }

  // T51, decision Q8b: rotates the refresh token; an old one gets 401
  @Post("refresh")
  refresh(@Body() body: RefreshTokenDto) {
    return this.sessions.refresh(body.refreshToken);
  }

  // T123: revokes the current session only
  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() body: RefreshTokenDto) {
    await this.sessions.logout(body.refreshToken);
  }

  @UseGuards(GoogleAuthGuard)
  @Get("google")
  async googleAuth() {
    // Starts the Google OAuth flow
  }

  @UseGuards(GoogleResetAuthGuard)
  @Get("google/reset-password")
  async googleResetPassword() {
    // Starts Google OAuth with state=reset-password
  }

  @UseGuards(GoogleAuthGuard)
  @Get("google/callback")
  async googleAuthCallback(
    @Req() req: Request & { user: GoogleUser },
    @Res() res: Response,
  ) {
    const token = this.authService.generateJwtFromGoogleUser(req.user);
    const state = req.query?.state;

    // decision Q9: the tokens travel in the URL fragment, which never reaches a
    // server or proxy log; the frontend loads the user from GET /auth/profile
    if (state === "reset-password") {
      // only for setting a new password: no session, so no refresh token
      res.redirect(`${frontendUrl()}/reset-password#token=${token}`);
    } else {
      // M12: a sign-in starts a session like the local login
      const refreshToken = await this.sessions.start(req.user.userId);
      res.redirect(
        `${frontendUrl()}/auth-callback#token=${token}&refreshToken=${refreshToken}`,
      );
    }
  }

  // T52: always 204, so the answer doesn't reveal whether the address exists
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post("forgot-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    await this.passwordReset.requestReset(body.email);
  }

  // a reset token from the e-mail link or an access token (Google reset path);
  // the change ends all of the user's sessions
  @UseGuards(PasswordChangeGuard)
  @Post("set-new-password")
  async setNewPassword(
    @Req() req: PasswordChangeRequest,
    @Body() body: NewPasswordDto,
  ) {
    await this.passwordReset.changePassword(req.user.userId, body.password);
    return { message: "Passwort erfolgreich geändert" };
  }

  @UseGuards(JwtAuthGuard)
  @Get("profile")
  getProfile(@Req() req: AuthenticatedRequest) {
    return req.user;
  }
}
