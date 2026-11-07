import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { PrismaModule } from "../../shared/infrastructure/prisma/prisma.module";
import { AuthService } from "./application/auth.service";
import { PermissionsService } from "./application/permissions.service";
import { RolePermissionsService } from "./application/role-permissions.service";
import { RolesService } from "./application/roles.service";
import { UsersService } from "./application/users.service";
import {
  PermissionRepository,
  RolePermissionRepository,
  RoleRepository,
} from "./application/ports/access.repositories";
import { UserRepository } from "./application/ports/user.repository";
import { jwtModuleOptions } from "./infrastructure/jwt.config";
import {
  PrismaPermissionRepository,
  PrismaRolePermissionRepository,
  PrismaRoleRepository,
} from "./infrastructure/persistence/prisma-access.repositories";
import { PrismaUserRepository } from "./infrastructure/persistence/prisma-user.repository";
import { GoogleStrategy } from "./infrastructure/security/google.strategy";
import { JwtStrategy } from "./infrastructure/security/jwt.strategy";
import { LocalStrategy } from "./infrastructure/security/local.strategy";
import { AuthController } from "./presentation/auth.controller";
import { PermissionsController } from "./presentation/permissions.controller";
import { RolesController } from "./presentation/roles.controller";
import { UsersController } from "./presentation/users.controller";
import { PermissionsGuard } from "./presentation/security/permissions.guard";
import { RolesGuard } from "./presentation/security/roles.guard";

/**
 * identity-access (GOALS.md M11): authentication, users, roles and
 * permissions. Global, because every context's controllers use its guards
 * (re-exported through shared/presentation/security) and PermissionsService.
 */
@Global()
@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: jwtModuleOptions,
    }),
  ],
  controllers: [
    AuthController,
    UsersController,
    RolesController,
    PermissionsController,
  ],
  providers: [
    AuthService,
    UsersService,
    RolesService,
    RolePermissionsService,
    PermissionsService,
    { provide: UserRepository, useClass: PrismaUserRepository },
    { provide: PermissionRepository, useClass: PrismaPermissionRepository },
    { provide: RoleRepository, useClass: PrismaRoleRepository },
    {
      provide: RolePermissionRepository,
      useClass: PrismaRolePermissionRepository,
    },
    JwtStrategy,
    LocalStrategy,
    GoogleStrategy,
    RolesGuard,
    PermissionsGuard,
  ],
  exports: [
    PermissionsService,
    RolesGuard,
    PermissionsGuard,
    JwtModule,
    PassportModule,
  ],
})
export class IdentityAccessModule {}
