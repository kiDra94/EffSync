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
import { ApiBearerAuth } from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { Roles } from "../auth/decorators/roles.decorator";

@UseGuards(JwtAuthGuard)
@ApiBearerAuth("bearer")
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
  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions("manage_users")
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  /**
   * GET /users/profile
   * Returns the current user's profile with role.
   *
   * No special permissions required (only a JWT).
   */
  @Get("profile")
  getProfile(@Req() req) {
    return { ...req.user };
  }

  /**
   * GET /users/me/permissions
   * Returns all roles and permissions of the current user.
   *
   * No special permissions required (only a JWT).
   */
  @Get("me/permissions")
  async getMyPermissions(@Req() req) {
    return this.usersService.getUserPermissionsAndRoles(req.user.userId);
  }

  /**
   * GET /users/:id/permissions
   * Returns all roles and permissions of a given user.
   *
   * Permissions:
   * - requires the permission 'manage_users'
   */
  @Get(":id/permissions")
  @UseGuards(PermissionsGuard)
  @Permissions("manage_users")
  async getUserPermissions(@Param("id") id: string) {
    return this.usersService.getUserPermissionsAndRoles(+id);
  }

  /**
   * GET /users/for-chat
   * Returns all users with minimal info for the chat (only a JWT required).
   */
  @Get("for-chat")
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
  @Get()
  @UseGuards(PermissionsGuard)
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
  @Get(":id")
  @UseGuards(PermissionsGuard)
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
  @Patch(":id")
  @UseGuards(PermissionsGuard)
  @Permissions("manage_users")
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
  @Delete(":id")
  @UseGuards(PermissionsGuard)
  @Permissions("manage_users")
  remove(@Param("id") id: string) {
    return this.usersService.remove(+id);
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
  @Post(":id/permissions")
  @UseGuards(PermissionsGuard)
  @Permissions("manage_users")
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
  @Delete(":id/permissions/:permissionId")
  @UseGuards(PermissionsGuard)
  @Permissions("manage_users")
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
  @Post(":id/roles")
  @UseGuards(PermissionsGuard)
  @Permissions("manage_users")
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
  @Delete(":id/roles/:roleId")
  @UseGuards(PermissionsGuard)
  @Permissions("manage_users")
  async removeRoleFromUser(
    @Param("id") userId: string,
    @Param("roleId") roleId: string,
  ) {
    return this.usersService.removeRoleFromUser(+userId, +roleId);
  }
}
