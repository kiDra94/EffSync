import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { PermissionsService } from "../application/permissions.service";
import { JwtAuthGuard } from "./security/jwt-auth.guard";
import { PermissionsGuard } from "./security/permissions.guard";
import { Permissions } from "./security/permissions.decorator";

@ApiTags("permissions")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Kein oder ungültiges Token" })
@ApiForbiddenResponse({ description: "Fehlende Rolle oder Berechtigung" })
@UseGuards(JwtAuthGuard)
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
  @ApiOperation({
    summary: "Returns all available permissions",
    description: "Requires the permission manage_users.",
  })
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
  @ApiOperation({
    summary: "Returns one permission with its details",
    description: "Requires the permission manage_users.",
  })
  @Get(":id")
  @UseGuards(PermissionsGuard)
  @Permissions("manage_users")
  async findOne(@Param("id") id: string) {
    return this.permissionsService.findOne(+id);
  }
}
