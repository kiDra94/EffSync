import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { PermissionsService } from "./permissions.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Permissions } from "../auth/decorators/permissions.decorator";

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
