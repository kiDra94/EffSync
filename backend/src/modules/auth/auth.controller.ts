import { Controller, Post, Body, UseGuards, Get, Req, Res } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { CreateUserDto } from "../users/dto/create-user.dto";
import { LoginDto } from "./dto/login.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { GoogleAuthGuard } from "./guards/google-auth.guard";
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

  @UseGuards(GoogleAuthGuard)
  @Get("google/callback")
  async googleAuthCallback(@Req() req, @Res() res) {
    console.log('🔐 Google OAuth Callback - User:', req.user);
    
    // Generiere JWT Token
    const token = await this.authService.generateJwtFromGoogleUser(req.user);
    
    // Redirect zu Frontend mit Token
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    res.redirect(`${frontendUrl}/auth-callback?token=${token}&user=${encodeURIComponent(JSON.stringify(req.user))}`);
  }

  @UseGuards(JwtAuthGuard)
  @Get("profile")
  async getProfile(@Req() req) {
    return req.user;
  }
}
