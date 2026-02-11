import { Injectable } from "@nestjs/common";
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
    return this.prisma.users.create({
      data: {
        ...userWithoutPassword,
        password_hash: hashPassword
      }
    });
  }

  findAll() {
    return `This action returns all users`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
