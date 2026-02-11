import { Injectable } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import { CreateUserDto } from "../users/dto/create-user.dto";

@Injectable()
export class AuthService {
  constructor(
    private userService: UsersService,
  ) {}
  async register(createUserDto: CreateUserDto) {
    return await this.userService.create(createUserDto);
  }
  
  async login() {
    
  }
}
