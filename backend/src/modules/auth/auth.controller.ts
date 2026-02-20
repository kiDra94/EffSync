import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { CreateUserDto } from "../users/dto/create-user.dto";
import { LoginDto } from "./dto/login.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  register(@Body() CreateUserDto: CreateUserDto) {
    return this.authService.register(CreateUserDto);
  }

  @Post("login")
  login(@Body() LoginDto: LoginDto) {
    return this.authService.login(LoginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get("profile")
  getProfile(@Req() req) {
    return req.user;
  }
}
