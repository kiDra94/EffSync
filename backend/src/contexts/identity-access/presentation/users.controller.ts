import { PermissionFlag } from "../domain/permission-flag";
import type { AuthenticatedRequest } from "./security/authenticated-request";
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { UsersService } from "../application/users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { JwtAuthGuard } from "./security/jwt-auth.guard";
import { PermissionsGuard } from "./security/permissions.guard";
import { RolesGuard } from "./security/roles.guard";
import { Permissions } from "./security/permissions.decorator";
import { Roles } from "./security/roles.decorator";

@ApiTags("users")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Kein oder ungültiges Token" })
@ApiForbiddenResponse({ description: "Fehlende Rolle oder Berechtigung" })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * POST /users
   * Creates a new user.
   *
   * Permissions:
   * - requires the permission 'manage_users'
   */
  @ApiOperation({
    summary: "Creates a new user",
    description: "Requires the permission manage_users.",
  })
  @Post()
  @Permissions("manage_users", PermissionFlag.WRITE)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  /**
   * GET /users/profile
   * Returns the current user's profile with role.
   *
   * Requires the permission view_dashboard.
   */
  @ApiOperation({
    summary: "Returns the current user's profile with role",
    description: "Requires the permission view_dashboard.",
  })
  @Get("profile")
  @Permissions("view_dashboard")
  getProfile(@Req() req: AuthenticatedRequest) {
    return { ...req.user };
  }

  /**
   * GET /users/me/permissions
   * Returns all roles and permissions of the current user.
   *
   * Requires the permission view_dashboard.
   */
  @ApiOperation({
    summary: "Returns all roles and permissions of the current user",
    description: "Requires the permission view_dashboard.",
  })
  @Get("me/permissions")
  @Permissions("view_dashboard")
  async getMyPermissions(@Req() req: AuthenticatedRequest) {
    return this.usersService.getUserPermissionsAndRoles(req.user.userId);
  }

  /**
   * GET /users/:id/permissions
   * Returns all roles and permissions of a given user.
   *
   * Permissions:
   * - requires the permission 'manage_users'
   */
  @ApiOperation({
    summary: "Returns all roles and permissions of a given user",
    description: "Requires the permission manage_users.",
  })
  @Get(":id/permissions")
  @Permissions("manage_users")
  async getUserPermissions(@Param("id") id: string) {
    return this.usersService.getUserPermissionsAndRoles(+id);
  }

  /**
   * GET /users/for-chat
   * Returns all users with minimal info for the chat (view_dashboard).
   */
  @ApiOperation({
    summary: "Returns all users with minimal info for the chat",
    description: "Requires the permission view_dashboard.",
  })
  @Get("for-chat")
  @Permissions("view_dashboard")
  findAllForChat() {
    return this.usersService.findAllForChat();
  }

  /**
   * GET /users
   * Returns all users.
   *
   * Permissions:
   * - requires the permission 'manage_users'
   */
  @ApiOperation({
    summary: "Returns all users",
    description: "Requires the permission manage_users.",
  })
  @Get()
  @Permissions("manage_users")
  findAll() {
    return this.usersService.findAll();
  }

  /**
   * GET /users/:id
   * Returns one user.
   *
   * Permissions:
   * - requires the permission 'manage_users'
   */
  @ApiOperation({
    summary: "Returns one user",
    description: "Requires the permission manage_users.",
  })
  @Get(":id")
  @Permissions("manage_users")
  findOne(@Param("id") id: string) {
    return this.usersService.findOne(+id);
  }

  /**
   * PATCH /users/:id
   * Updates a user.
   *
   * Permissions:
   * - requires the permission 'manage_users'
   */
  @ApiOperation({
    summary: "Updates a user",
    description: "Requires the permission manage_users.",
  })
  @Patch(":id")
  @Permissions("manage_users", PermissionFlag.WRITE)
  update(@Param("id") id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  /**
   * DELETE /users/:id
   * Deletes a user.
   *
   * Permissions:
   * - requires the permission 'manage_users'
   */
  @ApiOperation({
    summary: "Deletes a user",
    description: "Requires the permission manage_users.",
  })
  @Delete(":id")
  @Permissions("manage_users", PermissionFlag.EXECUTE)
  remove(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.usersService.remove(+id, req.user.userId);
  }

  /**
   * POST /users/:id/permissions
   * Adds a new permission to a user.
   *
   * Body:
   * {
   *   "permission_id": 4,
   *   "valid_from": "2026-03-25",  // Optional
   *   "valid_to": "2026-07-31"     // Optional
   * }
   *
   * Permissions:
   * - requires the permission 'manage_users'
   */
  @ApiOperation({
    summary: "Adds a new permission to a user",
    description:
      "Body: permission_id, optionally valid_from and valid_to. Requires the permission manage_users.",
  })
  @Post(":id/permissions")
  @Permissions("manage_users", PermissionFlag.WRITE)
  async addPermissionToUser(
    @Param("id") userId: string,
    @Body()
    dto: {
      permission_id: number;
      valid_from?: string;
      valid_to?: string;
    },
  ) {
    const validFrom = dto.valid_from ? new Date(dto.valid_from) : null;
    const validTo = dto.valid_to ? new Date(dto.valid_to) : null;

    return this.usersService.addPermissionToUser(
      +userId,
      dto.permission_id,
      validFrom,
      validTo,
    );
  }

  /**
   * DELETE /users/:id/permissions/:permissionId
   * Removes a permission from a user.
   *
   * Permissions:
   * - requires the permission 'manage_users'
   */
  @ApiOperation({
    summary: "Removes a permission from a user",
    description: "Requires the permission manage_users.",
  })
  @Delete(":id/permissions/:permissionId")
  @Permissions("manage_users", PermissionFlag.EXECUTE)
  async removePermissionFromUser(
    @Param("id") userId: string,
    @Param("permissionId") permissionId: string,
  ) {
    return this.usersService.removePermissionFromUser(+userId, +permissionId);
  }

  /**
   * POST /users/:id/roles
   * Assigns a role to a user.
   *
   * Body:
   * {
   *   "role_id": 3
   * }
   *
   * Permissions:
   * - requires the permission 'manage_users'
   */
  @ApiOperation({
    summary: "Assigns a role to a user",
    description: "Requires the permission manage_users.",
  })
  @Post(":id/roles")
  @Permissions("manage_users", PermissionFlag.WRITE)
  async addRoleToUser(
    @Param("id") userId: string,
    @Body() dto: { role_id: number },
  ) {
    return this.usersService.addRoleToUser(+userId, dto.role_id);
  }

  /**
   * DELETE /users/:id/roles/:roleId
   * Removes a role from a user.
   *
   * Permissions:
   * - requires the permission 'manage_users'
   */
  @ApiOperation({
    summary: "Removes a role from a user",
    description: "Requires the permission manage_users.",
  })
  @Delete(":id/roles/:roleId")
  @Permissions("manage_users", PermissionFlag.EXECUTE)
  async removeRoleFromUser(
    @Param("id") userId: string,
    @Param("roleId") roleId: string,
  ) {
    return this.usersService.removeRoleFromUser(+userId, +roleId);
  }
}
