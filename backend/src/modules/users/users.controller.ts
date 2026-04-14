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
@ApiBearerAuth('bearer')
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * POST /users
   * Erstellt einen neuen Benutzer.
   * 
   * Berechtigungen:
   * - Muss Permission 'manage_users' haben
   */
  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions('manage_users')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  /**
   * GET /users/profile
   * Holt das Profil des aktuellen Benutzers mit Rolle.
   * 
   * Keine speziellen Berechtigungen erforderlich (nur JWT erforderlich).
   */
  @Get("profile")
  getProfile(@Req() req) {
    return { ...req.user };
  }

  /**
   * GET /users/me/permissions
   * Holt alle Rollen und Permissions des aktuellen Benutzers.
   * 
   * Keine speziellen Berechtigungen erforderlich (nur JWT erforderlich).
   */
  @Get("me/permissions")
  async getMyPermissions(@Req() req) {
    return this.usersService.getUserPermissionsAndRoles(req.user.userId);
  }

  /**
   * GET /users/:id/permissions
   * Holt alle Rollen und Permissions eines spezifischen Benutzers.
   * 
   * Berechtigungen:
   * - Muss Permission 'manage_users' haben
   */
  @Get(":id/permissions")
  @UseGuards(PermissionsGuard)
  @Permissions('manage_users')
  async getUserPermissions(@Param("id") id: string) {
    return this.usersService.getUserPermissionsAndRoles(+id);
  }

  /**
   * GET /users/for-chat
   * Holt alle User mit minimalen Infos für den Chat (nur JWT erforderlich).
   */
  @Get('for-chat')
  findAllForChat() {
    return this.usersService.findAllForChat();
  }

  /**
   * GET /users
   * Holt alle Benutzer.
   * 
   * Berechtigungen:
   * - Muss Permission 'manage_users' haben
   */
  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions('manage_users')
  findAll() {
    return this.usersService.findAll();
  }

  /**
   * GET /users/:id
   * Holt einen spezifischen Benutzer.
   * 
   * Berechtigungen:
   * - Muss Permission 'manage_users' haben
   */
  @Get(":id")
  @UseGuards(PermissionsGuard)
  @Permissions('manage_users')
  findOne(@Param("id") id: string) {
    return this.usersService.findOne(+id);
  }

  /**
   * PATCH /users/:id
   * Aktualisiert einen Benutzer.
   * 
   * Berechtigungen:
   * - Muss Permission 'manage_users' haben
   */
  @Patch(":id")
  @UseGuards(PermissionsGuard)
  @Permissions('manage_users')
  update(@Param("id") id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  /**
   * DELETE /users/:id
   * Löscht einen Benutzer.
   * 
   * Berechtigungen:
   * - Muss Permission 'manage_users' haben
   */
  @Delete(":id")
  @UseGuards(PermissionsGuard)
  @Permissions('manage_users')
  remove(@Param("id") id: string) {
    return this.usersService.remove(+id);
  }

  /**
   * POST /users/:id/permissions
   * Fügt eine neue Permission zu einem User hinzu.
   * 
   * Body:
   * {
   *   "permission_id": 4,
   *   "valid_from": "2026-03-25",  // Optional
   *   "valid_to": "2026-07-31"     // Optional
   * }
   * 
   * Berechtigungen:
   * - Muss Permission 'manage_users' haben
   */
  @Post(':id/permissions')
  @UseGuards(PermissionsGuard)
  @Permissions('manage_users')
  async addPermissionToUser(
    @Param('id') userId: string,
    @Body() dto: { 
      permission_id: number; 
      valid_from?: string; 
      valid_to?: string; 
    }
  ) {
    const validFrom = dto.valid_from ? new Date(dto.valid_from) : null;
    const validTo = dto.valid_to ? new Date(dto.valid_to) : null;

    return this.usersService.addPermissionToUser(
      +userId,
      dto.permission_id,
      validFrom,
      validTo
    );
  }

  /**
   * DELETE /users/:id/permissions/:permissionId
   * Entfernt eine Permission von einem User.
   * 
   * Berechtigungen:
   * - Muss Permission 'manage_users' haben
   */
  @Delete(':id/permissions/:permissionId')
  @UseGuards(PermissionsGuard)
  @Permissions('manage_users')
  async removePermissionFromUser(
    @Param('id') userId: string,
    @Param('permissionId') permissionId: string
  ) {
    return this.usersService.removePermissionFromUser(+userId, +permissionId);
  }

  /**
   * POST /users/:id/roles
   * Weist eine Rolle zu einem User zu.
   * 
   * Body:
   * {
   *   "role_id": 3
   * }
   * 
   * Berechtigungen:
   * - Muss Permission 'manage_users' haben
   */
  @Post(':id/roles')
  @UseGuards(PermissionsGuard)
  @Permissions('manage_users')
  async addRoleToUser(
    @Param('id') userId: string,
    @Body() dto: { role_id: number }
  ) {
    return this.usersService.addRoleToUser(+userId, dto.role_id);
  }

  /**
   * DELETE /users/:id/roles/:roleId
   * Entfernt eine Rolle von einem User.
   * 
   * Berechtigungen:
   * - Muss Permission 'manage_users' haben
   */
  @Delete(':id/roles/:roleId')
  @UseGuards(PermissionsGuard)
  @Permissions('manage_users')
  async removeRoleFromUser(
    @Param('id') userId: string,
    @Param('roleId') roleId: string
  ) {
    return this.usersService.removeRoleFromUser(+userId, +roleId);
  }
}
