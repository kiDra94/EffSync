import { Injectable, UnauthorizedException } from "@nestjs/common";
import { CreateUserDto } from "../users/dto/create-user.dto";
import { LoginDto } from "./dto/login.dto";
import * as bcrypt from 'bcrypt';
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}
  async register(createUserDto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const { password, ...userWithoutPassword } = createUserDto;
    return await this.prisma.users.create({
      data: {
        ...userWithoutPassword,
        password_hash: hashedPassword,
      }
    });
  }
  
  async login(LoginDto: LoginDto) {
    const user = await this.prisma.users.findUnique({
      where: { username: LoginDto.username },
    });
    if(!user) {
      throw new UnauthorizedException('Username existiert nicht');
    }
    const isPasswordValid = await bcrypt.compare(LoginDto.password, user.password_hash);
    if(!isPasswordValid) {
      throw new UnauthorizedException('Passwort ist ungültig');
    }
    const { password_hash, ...userWithNoPassword } = user;
    const payload = { 
      sub: user.user_id, 
      username: user.username, 
    };
    // const dummyToken = 'TEST_TOKEN_123456';
    return {
      ...userWithNoPassword,
      token: this.jwtService.sign(payload),
    };
  }

  async validateUser(userId: number) {
    return await this.prisma.users.findUnique({
      where: { user_id: userId },
    });
  }
}
