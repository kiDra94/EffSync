import { Global, Module } from "@nestjs/common";
import { RealtimeAuthenticator } from "../../shared/application/realtime";
import { JwtRealtimeAuthenticator } from "./infrastructure/jwt-realtime-authenticator";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { PrismaModule } from "../../shared/infrastructure/prisma/prisma.module";
import { AuthService } from "./application/auth.service";
import { PermissionsService } from "./application/permissions.service";
import { RolesService } from "./application/roles.service";
import { UsersService } from "./application/users.service";
import { SessionService } from "./application/session.service";
import { PasswordResetService } from "./application/password-reset.service";
import { TwoFactorService } from "./application/two-factor.service";
import { UserSettingsService } from "./application/user-settings.service";
import { UserSettingsRepository } from "./application/ports/user-settings.repository";
import { PrismaUserSettingsRepository } from "./infrastructure/persistence/prisma-user-settings.repository";
import { AvatarService } from "./application/avatar.service";
import { AvatarRepository } from "./application/ports/avatar.repository";
import { PrismaAvatarRepository } from "./infrastructure/persistence/prisma-avatar.repository";
import { FileInspector } from "../../shared/application/file-inspector";
import { MagicByteFileInspector } from "../../shared/infrastructure/files/magic-byte-file-inspector";
import { SecretCipher } from "./application/ports/secret-cipher";
import { Totp } from "./application/ports/totp";
import { TwoFactorChallenges } from "./application/ports/two-factor-challenges";
import { TwoFactorRepository } from "./application/ports/two-factor.repository";
import { AccountDeletionRegistry } from "./application/account-deletion";
import { ResetTokens } from "./application/ports/reset-tokens";
import {
  PermissionRepository,
  RoleRepository,
} from "./application/ports/access.repositories";
import { UserRepository } from "./application/ports/user.repository";
import { RefreshTokenRepository } from "./application/ports/refresh-token.repository";
import { jwtModuleOptions } from "./infrastructure/jwt.config";
import {
  PrismaPermissionRepository,
  PrismaRoleRepository,
} from "./infrastructure/persistence/prisma-access.repositories";
import { PrismaUserRepository } from "./infrastructure/persistence/prisma-user.repository";
import { PrismaRefreshTokenRepository } from "./infrastructure/persistence/prisma-refresh-token.repository";
import { GoogleStrategy } from "./infrastructure/security/google.strategy";
import { JwtStrategy } from "./infrastructure/security/jwt.strategy";
import { LocalStrategy } from "./infrastructure/security/local.strategy";
import { SessionCleanupJob } from "./infrastructure/session-cleanup.job";
import { JwtResetTokens } from "./infrastructure/security/jwt-reset-tokens";
import { AesGcmSecretCipher } from "./infrastructure/security/aes-gcm-secret-cipher";
import { JwtTwoFactorChallenges } from "./infrastructure/security/jwt-two-factor-challenges";
import { OtplibTotp } from "./infrastructure/security/otplib-totp";
import { PrismaTwoFactorRepository } from "./infrastructure/persistence/prisma-two-factor.repository";
import { AuthController } from "./presentation/auth.controller";
import { TwoFactorController } from "./presentation/two-factor.controller";
import { PermissionsController } from "./presentation/permissions.controller";
import { RolesController } from "./presentation/roles.controller";
import { UsersController } from "./presentation/users.controller";
import { AvatarController } from "./presentation/avatar.controller";
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
    TwoFactorController,
    UsersController,
    AvatarController,
    RolesController,
    PermissionsController,
  ],
  providers: [
    AuthService,
    UsersService,
    RolesService,
    PermissionsService,
    SessionService,
    PasswordResetService,
    // M32: TOTP as the login's second factor (decision Q8d)
    TwoFactorService,
    { provide: TwoFactorRepository, useClass: PrismaTwoFactorRepository },
    { provide: Totp, useClass: OtplibTotp },
    { provide: SecretCipher, useClass: AesGcmSecretCipher },
    { provide: TwoFactorChallenges, useClass: JwtTwoFactorChallenges },
    // M25: the theme per user (decision Q8f)
    UserSettingsService,
    { provide: UserSettingsRepository, useClass: PrismaUserSettingsRepository },
    AvatarService,
    { provide: AvatarRepository, useClass: PrismaAvatarRepository },
    { provide: FileInspector, useClass: MagicByteFileInspector },
    AccountDeletionRegistry,
    { provide: RealtimeAuthenticator, useClass: JwtRealtimeAuthenticator },
    { provide: ResetTokens, useClass: JwtResetTokens },
    { provide: UserRepository, useClass: PrismaUserRepository },
    { provide: PermissionRepository, useClass: PrismaPermissionRepository },
    { provide: RoleRepository, useClass: PrismaRoleRepository },
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
