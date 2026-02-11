import { Injectable, UnauthorizedException } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import { CreateUserDto } from "../users/dto/create-user.dto";
import { LoginDto } from "./dto/login.dot";
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private userService: UsersService,
  ) {}
  async register(createUserDto: CreateUserDto) {
    return await this.userService.create(createUserDto);
  }
  
  async login(LoginDto: LoginDto) {
    const user = await this.userService.findByEmail(LoginDto.email);
    if(!user) {
      throw new UnauthorizedException('Email existiert nicht');
    }
    const isPasswordValid = await bcrypt.compare(LoginDto.password, user.password_hash);
    if(!isPasswordValid) {
      throw new UnauthorizedException('Passwort ist ungültig');
    }
    const { password_hash, ...userWithNoPassword } = user;
    return userWithNoPassword;
  }
}
