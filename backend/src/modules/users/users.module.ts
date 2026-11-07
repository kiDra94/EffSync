import { Module } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { PrismaModule } from "../../shared/infrastructure/prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { RolesModule } from "../roles/roles.module";

@Module({
  imports: [PrismaModule, AuthModule, RolesModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
