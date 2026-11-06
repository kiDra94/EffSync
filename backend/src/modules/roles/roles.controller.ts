import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { RolesService } from "./roles.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Permissions } from "../auth/decorators/permissions.decorator";

@UseGuards(JwtAuthGuard)
@ApiBearerAuth("bearer")
@Controller("roles")
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /**
   * GET /roles
   * Holt alle verfügbaren Rollen.
   *
   * Berechtigungen:
   * - Muss Permission 'manage_users' haben
   */
  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions("manage_users")
  async findAll() {
    return this.rolesService.findAll();
  }

  /**
   * GET /roles/:id
   * Holt eine spezifische Rolle mit ihren Permissions.
   *
   * Berechtigungen:
   * - Muss Permission 'manage_users' haben
   */
  @Get(":id")
  @UseGuards(PermissionsGuard)
  @Permissions("manage_users")
  async findOne(@Param("id") id: string) {
    return this.rolesService.findOne(+id);
  }
}
