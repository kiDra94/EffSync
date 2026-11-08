import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ChatRoomsModule } from "./modules/chat-rooms/chat-rooms.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { EmailModule } from "./modules/email/email.module";
import { EmailPortsModule } from "./modules/email/email-ports.module";
import { NotificationPortsModule } from "./modules/notifications/notification-ports.module";
import { WebsocketPortsModule } from "./modules/websocket/websocket-ports.module";
import { TaskManagementModule } from "./contexts/task-management/task-management.module";
import { DocumentsNotesModule } from "./contexts/documents-notes/documents-notes.module";
import { SchedulesModule } from "./modules/schedules/schedules.module";
import { ClassesModule } from "./modules/classes/classes.module";
import { DepartmentsModule } from "./modules/departments/departments.module";
import { PrismaModule } from "./shared/infrastructure/prisma/prisma.module";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { IdentityAccessModule } from "./contexts/identity-access/identity-access.module";
import { validateEnv } from "./shared/infrastructure/config/env.validation";
import {
  ThrottlerGuard,
  ThrottlerModule,
  ThrottlerModuleOptions,
} from "@nestjs/throttler";
import { ChatMessagesModule } from "./modules/chat-messages/chat-messages.module";
import { RoomsModule } from "./modules/rooms/room.module";
import { LessonSlotsModule } from "./modules/lesson-slots/lesson-slots.module";
import { APP_GUARD } from "@nestjs/core";
import { SubjectsModule } from "./modules/subjects/subjects.module";
import { WebsocketModule } from "./modules/websocket/websocket.module";
import { MetricsModule } from "./modules/metrics/metrics.module";

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
    ChatRoomsModule,
    ChatMessagesModule,
    NotificationsModule,
    EmailModule,
    EmailPortsModule,
    NotificationPortsModule,
    WebsocketPortsModule,
    TaskManagementModule,
    DocumentsNotesModule,
    SchedulesModule,
    ClassesModule,
    DepartmentsModule,
    PrismaModule,
    LessonSlotsModule,
    RoomsModule,
    SubjectsModule,
    WebsocketModule,
    MetricsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
