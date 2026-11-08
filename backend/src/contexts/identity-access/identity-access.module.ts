import { Global, Module } from "@nestjs/common";
import { RealtimeAuthenticator } from "../../shared/application/realtime";
import { JwtRealtimeAuthenticator } from "./infrastructure/jwt-realtime-authenticator";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { PrismaModule } from "../../shared/infrastructure/prisma/prisma.module";
import { AuthService } from "./application/auth.service";
import { PermissionsService } from "./application/permissions.service";
import { RolePermissionsService } from "./application/role-permissions.service";
import { RolesService } from "./application/roles.service";
import { UsersService } from "./application/users.service";
import { SessionService } from "./application/session.service";
import { PasswordResetService } from "./application/password-reset.service";
import { AccountDeletionRegistry } from "./application/account-deletion";
import { ResetTokens } from "./application/ports/reset-tokens";
import {
  PermissionRepository,
  RolePermissionRepository,
  RoleRepository,
} from "./application/ports/access.repositories";
import { UserRepository } from "./application/ports/user.repository";
import { RefreshTokenRepository } from "./application/ports/refresh-token.repository";
import { jwtModuleOptions } from "./infrastructure/jwt.config";
import {
  PrismaPermissionRepository,
  PrismaRolePermissionRepository,
  PrismaRoleRepository,
} from "./infrastructure/persistence/prisma-access.repositories";
import { PrismaUserRepository } from "./infrastructure/persistence/prisma-user.repository";
import { PrismaRefreshTokenRepository } from "./infrastructure/persistence/prisma-refresh-token.repository";
import { GoogleStrategy } from "./infrastructure/security/google.strategy";
import { JwtStrategy } from "./infrastructure/security/jwt.strategy";
import { LocalStrategy } from "./infrastructure/security/local.strategy";
import { SessionCleanupJob } from "./infrastructure/session-cleanup.job";
import { JwtResetTokens } from "./infrastructure/security/jwt-reset-tokens";
import { AuthController } from "./presentation/auth.controller";
import { PermissionsController } from "./presentation/permissions.controller";
import { RolesController } from "./presentation/roles.controller";
import { UsersController } from "./presentation/users.controller";
import { PermissionsGuard } from "./presentation/security/permissions.guard";
import { RolesGuard } from "./presentation/security/roles.guard";
import { PasswordChangeGuard } from "./presentation/security/password-change.guard";

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
    SessionService,
    PasswordResetService,
    AccountDeletionRegistry,
    { provide: RealtimeAuthenticator, useClass: JwtRealtimeAuthenticator },
    { provide: ResetTokens, useClass: JwtResetTokens },
    { provide: UserRepository, useClass: PrismaUserRepository },
    { provide: PermissionRepository, useClass: PrismaPermissionRepository },
    { provide: RoleRepository, useClass: PrismaRoleRepository },
    {
      provide: RolePermissionRepository,
      useClass: PrismaRolePermissionRepository,
    },
    { provide: RefreshTokenRepository, useClass: PrismaRefreshTokenRepository },
    JwtStrategy,
    LocalStrategy,
    GoogleStrategy,
    SessionCleanupJob,
    RolesGuard,
    PermissionsGuard,
    PasswordChangeGuard,
  ],
  exports: [
    PermissionsService,
    AccountDeletionRegistry,
    RealtimeAuthenticator,
    RolesGuard,
    PermissionsGuard,
    JwtModule,
    PassportModule,
  ],
})
export class IdentityAccessModule {}
