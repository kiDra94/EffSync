import { Injectable, UnauthorizedException } from "@nestjs/common";
import { CreateUserDto } from "../users/dto/create-user.dto";
import { LoginDto } from "./dto/login.dto";
import * as bcrypt from "bcrypt";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}
  async register(createUserDto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const { password, ...userWithoutPassword } = createUserDto;
    const user = await this.prisma.users.create({
      data: {
        ...userWithoutPassword,
        password_hash: hashedPassword,
      },
    });

    // Assign default role: Student (role_id=2)
    try {
      const studentRole = await this.prisma.roles.findFirst({ where: { name: { in: ['Student', 'student'] } } });
      const roleId = studentRole?.role_id ?? 2;
      await this.prisma.user_roles.create({
        data: { user_id: user.user_id, role_id: roleId },
      });
    } catch (error) {
      console.error('Failed to assign default role during registration:', error);
    }

    return user;
  }

  async login(LoginDto: LoginDto) {
    const user = await this.prisma.users.findUnique({
      where: { username: LoginDto.username },
      include: {
        user_roles: {
          include: { roles: true },
        },
      },
    });
    if (!user) {
      throw new UnauthorizedException("Username existiert nicht");
    }
    if (!user.password_hash) {
      throw new UnauthorizedException("Passwort ist ungültig");
    }
    const isPasswordValid = await bcrypt.compare(
      LoginDto.password,
      user.password_hash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException("Passwort ist ungültig");
    }
    
    // Hole die erste Rolle des Benutzers (Primary Role)
    const primaryRole = user.user_roles && user.user_roles.length > 0 
      ? user.user_roles[0].roles?.name?.toLowerCase() 
      : 'user'; // Default Rolle
    
    const { password_hash, ...userWithNoPassword } = user;
    const payload = {
      sub: user.user_id,
      username: user.username,
      role: primaryRole, // Rolle hinzufügen!
    };
    // const dummyToken = 'TEST_TOKEN_123456';
    return {
      ...userWithNoPassword,
      role: primaryRole, // Rolle auch in Response mitgeben
      token: this.jwtService.sign(payload),
    };
  }

  async generateJwtFromGoogleUser(googleUser: any) {
    const payload = {
      sub: googleUser.userId,
      username: googleUser.username,
      role: googleUser.role,
    };
    return this.jwtService.sign(payload);
  }

  async validateUser(userId: number) {
    return await this.prisma.users.findUnique({
      where: { user_id: userId },
    });
  }

  async setNewPassword(userId: number, newPassword: string) {
    const hashed = await bcrypt.hash(newPassword, 10);
    return await this.prisma.users.update({
      where: { user_id: userId },
      data: { password_hash: hashed },
    });
  }
}
