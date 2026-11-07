import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./modules/auth/auth.module";
import { TasksModule } from "./modules/tasks/tasks.module";
import { TaskCommentsModule } from "./modules/task-comments/task-comments.module";
import { DocumentsModule } from "./modules/documents/documents.module";
import { ChatRoomsModule } from "./modules/chat-rooms/chat-rooms.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { EmailModule } from "./modules/email/email.module";
import { NotesModule } from "./modules/notes/notes.module";
import { SchedulesModule } from "./modules/schedules/schedules.module";
import { ClassesModule } from "./modules/classes/classes.module";
import { DepartmentsModule } from "./modules/departments/departments.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { validateEnv } from "./config/env.validation";
import {
  ThrottlerGuard,
  ThrottlerModule,
  ThrottlerModuleOptions,
} from "@nestjs/throttler";
import { UsersModule } from "./modules/users/users.module";
import { ChatMessagesModule } from "./modules/chat-messages/chat-messages.module";
import { RoomsModule } from "./modules/rooms/room.module";
import { LessonSlotsModule } from "./modules/lesson-slots/lesson-slots.module";
import { PermissionsModule } from "./modules/permissions/permissions.module";
import { RolesModule } from "./modules/roles/roles.module";
import { TaskActivityLogModule } from "./modules/task-activity-log/task-activity-log.module";
import { TaskMembersModule } from "./modules/task-members/task-members.module";
import { TaskTemplatesModule } from "./modules/task-templates/task-templates.module";
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
    AuthModule,
    UsersModule,
    TasksModule,
    TaskCommentsModule,
    DocumentsModule,
    ChatRoomsModule,
    ChatMessagesModule,
    NotificationsModule,
    EmailModule,
    NotesModule,
    SchedulesModule,
    ClassesModule,
    DepartmentsModule,
    PrismaModule,
    LessonSlotsModule,
    PermissionsModule,
    RolesModule,
    RoomsModule,
    TaskActivityLogModule,
    TaskMembersModule,
    TaskTemplatesModule,
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
