import { Module } from "@nestjs/common";
import { RolesController } from "./roles.controller";
import { RolesService } from "./roles.service";
import { RolePermissionsService } from "./role-permissions.service";
import { PrismaModule } from "src/prisma/prisma.module";
import { PermissionsModule } from "../permissions/permissions.module";

@Module({
  imports: [PrismaModule, PermissionsModule],
  controllers: [RolesController],
  providers: [RolesService, RolePermissionsService],
  exports: [RolesService, RolePermissionsService],
})
export class RolesModule {}
