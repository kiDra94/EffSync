import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { RolesService } from "../application/roles.service";
import { JwtAuthGuard } from "./security/jwt-auth.guard";
import { PermissionsGuard } from "./security/permissions.guard";
import { Permissions } from "./security/permissions.decorator";

@UseGuards(JwtAuthGuard)
@ApiBearerAuth("bearer")
@Controller("roles")
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /**
   * GET /roles
   * Returns all available roles.
   *
   * Permissions:
   * - requires the permission 'manage_users'
   */
  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions("manage_users")
  async findAll() {
    return this.rolesService.findAll();
  }

  /**
   * GET /roles/:id
   * Returns one role with its permissions.
   *
   * Permissions:
   * - requires the permission 'manage_users'
   */
  @Get(":id")
  @UseGuards(PermissionsGuard)
  @Permissions("manage_users")
  async findOne(@Param("id") id: string) {
    return this.rolesService.findOne(+id);
  }
}
