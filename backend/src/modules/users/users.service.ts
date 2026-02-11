import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { hash, genSalt } from "bcrypt";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}
  
  async create(createUserDto: CreateUserDto) {
    const saltRound = 10; // standard wert fuer web 2^10 Rounds
    const salt = await genSalt(saltRound);
    const hashPassword = await hash(createUserDto.password, salt);
    const { password, ...userWithoutPassword } = createUserDto;
    return await this.prisma.users.create({
      data: {
        ...userWithoutPassword,
        password_hash: hashPassword
      }
    });
  }

  async findByEmail(email: string) {
    return await this.prisma.users.findUnique({ where: { email : email } });
  }

  async findByUsername(username: string) { 
    return await this.prisma.users.findUnique({ where: { username : username } });
  }

  async findAll() {
    return await this.prisma.users.findMany();
  }

  async findOne(id: number) {
    const user = await this.prisma.users.findUnique({ where: { user_id: id } });
    if(!user) { throw new NotFoundException(`Member with ID ${id} not found`); }
    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    return await this.prisma.users.update({ where: { user_id: id }, data: updateUserDto });
  }

  async remove(id: number) {
    return await this.prisma.users.delete({ where: { user_id: id } });
  }
}
