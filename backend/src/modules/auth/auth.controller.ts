import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  Res,
  BadRequestException,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { CreateUserDto } from "../users/dto/create-user.dto";
import { LoginDto } from "./dto/login.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { GoogleAuthGuard } from "./guards/google-auth.guard";
import { GoogleResetAuthGuard } from "./guards/google-reset-auth.guard";
import { Throttle } from "@nestjs/throttler";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post("register")
  register(@Body() CreateUserDto: CreateUserDto) {
    return this.authService.register(CreateUserDto);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post("login")
  login(@Body() LoginDto: LoginDto) {
    return this.authService.login(LoginDto);
  }

  @UseGuards(GoogleAuthGuard)
  @Get("google")
  async googleAuth() {
    // Trigger für Google OAuth Flow
  }

  @UseGuards(GoogleResetAuthGuard)
  @Get("google/reset-password")
  async googleResetPassword() {
    // Trigger für Google OAuth mit state=reset-password
  }

  @UseGuards(GoogleAuthGuard)
  @Get("google/callback")
  async googleAuthCallback(@Req() req, @Res() res) {
    console.log("🔐 Google OAuth Callback - User:", req.user);

    const token = await this.authService.generateJwtFromGoogleUser(req.user);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const state = req.query?.state;

    if (state === "reset-password") {
      res.redirect(`${frontendUrl}/reset-password?token=${token}`);
    } else {
      res.redirect(
        `${frontendUrl}/auth-callback?token=${token}&user=${encodeURIComponent(JSON.stringify(req.user))}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post("set-new-password")
  async setNewPassword(@Req() req, @Body("password") password: string) {
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
  async getProfile(@Req() req) {
    return req.user;
  }
}
