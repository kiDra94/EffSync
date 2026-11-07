import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { PermissionsService } from "../application/permissions.service";
import { JwtAuthGuard } from "./security/jwt-auth.guard";
import { PermissionsGuard } from "./security/permissions.guard";
import { Permissions } from "./security/permissions.decorator";

@UseGuards(JwtAuthGuard)
@ApiBearerAuth("bearer")
@Controller("permissions")
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  /**
   * GET /permissions
   * Returns all available permissions.
   *
   * Permissions:
   * - requires the permission 'manage_users'
   */
  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions("manage_users")
  async findAll() {
    return this.permissionsService.findAll();
  }

  /**
   * GET /permissions/:id
   * Returns one permission with its details.
   *
   * Permissions:
   * - requires the permission 'manage_users'
   */
  @Get(":id")
  @UseGuards(PermissionsGuard)
  @Permissions("manage_users")
  async findOne(@Param("id") id: string) {
    return this.permissionsService.findOne(+id);
  }
}
