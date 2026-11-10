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
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { UsersService } from "../application/users.service";
import { TwoFactorService } from "../application/two-factor.service";
import { UserSettingsService } from "../application/user-settings.service";
import { AvatarService } from "../application/avatar.service";
import { UpdateUserSettingsDto } from "./dto/update-user-settings.dto";
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
  constructor(
    private readonly usersService: UsersService,
    private readonly twoFactor: TwoFactorService,
    private readonly settings: UserSettingsService,
    private readonly avatars: AvatarService,
  ) {}

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
  async getProfile(@Req() req: AuthenticatedRequest) {
    // the picture isn't part of the token check on every request (M37)
    return {
      ...req.user,
      profile_picture: await this.avatars.urlOf(req.user.userId),
    };
  }

  /**
   * GET /users/me/settings
   * The signed-in user's settings: the theme (T68, decision Q8f, M25).
   */
  @ApiOperation({
    summary: "Returns the current user's settings (the theme)",
    description: "Requires the permission view_dashboard.",
  })
  @Get("me/settings")
  @Permissions("view_dashboard")
  getSettings(@Req() req: AuthenticatedRequest) {
    return this.settings.find(req.user.userId);
  }

  /**
   * PATCH /users/me/settings
   * Stores the signed-in user's theme, for all their devices (T68, M25).
   */
  @ApiOperation({
    summary: "Changes the current user's settings (the theme)",
    description: "Requires the permission view_dashboard.",
  })
  @Patch("me/settings")
  @Permissions("view_dashboard")
  updateSettings(
    @Req() req: AuthenticatedRequest,
    @Body() body: UpdateUserSettingsDto,
  ) {
    return this.settings.update(req.user.userId, body);
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
  update(
    @Param("id") id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.usersService.update(+id, updateUserDto, req.user.userId);
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
   * DELETE /users/:id/two-factor
   * The admin reset of a user's 2FA (decision Q8d, M32): deletes the secret,
   * so the user signs in with the password alone and can set it up again.
   */
  @ApiOperation({
    summary: "Resets a user's two-factor authentication",
    description: "Requires the permission manage_users.",
  })
  @Delete(":id/two-factor")
  @Permissions("manage_users", PermissionFlag.EXECUTE)
  @HttpCode(HttpStatus.NO_CONTENT)
  resetTwoFactor(@Param("id", ParseIntPipe) id: number) {
    return this.twoFactor.reset(id);
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
    @Req() req: AuthenticatedRequest,
  ) {
    return this.usersService.addRoleToUser(
      +userId,
      dto.role_id,
      req.user.userId,
    );
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
    @Req() req: AuthenticatedRequest,
  ) {
    return this.usersService.removeRoleFromUser(
      +userId,
      +roleId,
      req.user.userId,
    );
  }
}
