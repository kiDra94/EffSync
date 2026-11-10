import { Module } from "@nestjs/common";
import { CommunicationModule } from "./contexts/communication/communication.module";
import { NotificationsModule } from "./contexts/notifications/notifications.module";
import { ScheduleModule } from "@nestjs/schedule";
import { RealtimeModule } from "./shared/infrastructure/realtime/realtime.module";
import { TaskManagementModule } from "./contexts/task-management/task-management.module";
import { SchoolOrganizationModule } from "./contexts/school-organization/school-organization.module";
import { DocumentsNotesModule } from "./contexts/documents-notes/documents-notes.module";
import { PrismaModule } from "./shared/infrastructure/prisma/prisma.module";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { IdentityAccessModule } from "./contexts/identity-access/identity-access.module";
import { validateEnv } from "./shared/infrastructure/config/env.validation";
import {
  ThrottlerGuard,
  ThrottlerModule,
  ThrottlerModuleOptions,
} from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { ReportingModule } from "./contexts/reporting/reporting.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
      // E2E runs take their whole environment from .env.test
      // (test/setup/test-env.ts); keys missing there must not come from .env
      ignoreEnvFile: process.env.NODE_ENV === "test",
      // the app refuses to start without JWT_SECRET and DATABASE_URL (M9)
      validate: validateEnv,
      cache: true,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): ThrottlerModuleOptions => ({
        throttlers: [
          {
            ttl: Number(config.get("THROTTLE_TTL")) || 60000,
            limit: Number(config.get("THROTTLE_LIMIT")) || 10,
          },
        ],
      }),
    }),
    IdentityAccessModule,
    CommunicationModule,
    // the cron scheduler for every @Cron (deadline jobs, session cleanup)
    ScheduleModule.forRoot(),
    NotificationsModule,
    RealtimeModule,
    TaskManagementModule,
    DocumentsNotesModule,
    SchoolOrganizationModule,
    PrismaModule,
    ReportingModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
