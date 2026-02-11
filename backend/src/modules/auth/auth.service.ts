import { Injectable, UnauthorizedException } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import { CreateUserDto } from "../users/dto/create-user.dto";
import { LoginDto } from "./dto/login.dto";
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
    const user = await this.userService.findByUsername(LoginDto.username);
    if(!user) {
      throw new UnauthorizedException('Username existiert nicht');
    }
    const isPasswordValid = await bcrypt.compare(LoginDto.password, user.password_hash);
    if(!isPasswordValid) {
      throw new UnauthorizedException('Passwort ist ungültig');
    }
    const { password_hash, ...userWithNoPassword } = user;
    const dummyToken = 'TEST_TOKEN_123456';
    return {
      ...userWithNoPassword,
      token: dummyToken,
    };
  }
}
