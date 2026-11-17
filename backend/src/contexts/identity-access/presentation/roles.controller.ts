import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { RolesService } from "../application/roles.service";
import { JwtAuthGuard } from "./security/jwt-auth.guard";
import { PermissionsGuard } from "./security/permissions.guard";
import { Permissions } from "./security/permissions.decorator";
import { RolesGuard } from "./security/roles.guard";
import { Roles } from "./security/roles.decorator";
import { PermissionFlag } from "../domain/permission-flag";
import { RoleName } from "../domain/role-permissions";
import { SetRolePermissionsDto } from "./dto/set-role-permissions.dto";

@ApiTags("roles")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Kein oder ungültiges Token" })
@ApiForbiddenResponse({ description: "Fehlende Rolle oder Berechtigung" })
@UseGuards(JwtAuthGuard)
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
  @ApiOperation({
    summary: "Returns all available roles",
    description: "Requires the permission manage_users.",
  })
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
  @ApiOperation({
    summary: "Returns one role with its permissions",
    description: "Requires the permission manage_users.",
  })
  @Get(":id")
  @UseGuards(PermissionsGuard)
  @Permissions("manage_users")
  async findOne(@Param("id") id: string) {
    return this.rolesService.findOne(+id);
  }

  // UC-40 "Systemkonfiguration" (T77, decisions Q18, A3, I2, I3): Admin holds
  // manage_system too, so the role check makes it the Superuser's
  @ApiOperation({
    summary: "Sets a role's permissions and their flags (Superuser)",
    description:
      "Requires the Superuser role and manage_system. Flags belong to the permission, for every role.",
  })
  @Put(":id/permissions")
  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles(RoleName.SUPERUSER)
  @Permissions("manage_system", PermissionFlag.WRITE)
  async setPermissions(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: SetRolePermissionsDto,
  ) {
    return this.rolesService.setPermissions(id, dto.permissions);
  }
}
