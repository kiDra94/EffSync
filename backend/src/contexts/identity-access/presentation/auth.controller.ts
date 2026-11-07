import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  Res,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { AuthService, GoogleUser } from "../application/auth.service";
import { SessionService } from "../application/session.service";
import type { UserWithRoles } from "../application/ports/identity-records";
import type { AuthenticatedRequest } from "./security/authenticated-request";
import type { Request, Response } from "express";
import { CreateUserDto } from "./dto/create-user.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { JwtAuthGuard } from "./security/jwt-auth.guard";
import { LocalAuthGuard } from "./security/local-auth.guard";
import { GoogleAuthGuard } from "./security/google-auth.guard";
import { GoogleResetAuthGuard } from "./security/google-reset-auth.guard";
import { Throttle } from "@nestjs/throttler";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessions: SessionService,
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
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const state = req.query?.state;

    // decision Q9: the tokens travel in the URL fragment, which never reaches a
    // server or proxy log; the frontend loads the user from GET /auth/profile
    if (state === "reset-password") {
      // only for setting a new password: no session, so no refresh token
      res.redirect(`${frontendUrl}/reset-password#token=${token}`);
    } else {
      // M12: a sign-in starts a session like the local login
      const refreshToken = await this.sessions.start(req.user.userId);
      res.redirect(
        `${frontendUrl}/auth-callback#token=${token}&refreshToken=${refreshToken}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post("set-new-password")
  async setNewPassword(
    @Req() req: AuthenticatedRequest,
    @Body("password") password: string,
  ) {
    if (!password || password.length < 6) {
      throw new BadRequestException(
        "Passwort muss mindestens 6 Zeichen lang sein",
      );
    }
    await this.authService.setNewPassword(req.user.userId, password);
    return { message: "Passwort erfolgreich geändert" };
  }

  @UseGuards(JwtAuthGuard)
  @Get("profile")
  getProfile(@Req() req: AuthenticatedRequest) {
    return req.user;
  }
}
