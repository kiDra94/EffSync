import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./modules/auth/auth.module";
import { TasksModule } from "./modules/tasks/tasks.module";
import { TaskCommentsModule } from "./modules/task-comments/task-comments.module";
import { TaskActivityModule } from "./modules/task-activity/task-activity.module";
import { TemplatesModule } from "./modules/templates/templates.module";
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
import {
  ThrottlerGuard,
  ThrottlerModule,
  ThrottlerModuleOptions,
} from "@nestjs/throttler";
import { UsersModule } from "./modules/users/users.module";
import { ChatMessagesModule } from "./modules/chat-messages/chat-messages.module";
import { ClassesTeachersModule } from "./modules/classes-teachers/classes-teachers.module";
import { DocumentSharesModule } from "./modules/document-shares/document-shares.module";
import { RoomsModule } from "./modules/rooms/room.module";
import { LessonSlotsModule } from "./modules/lesson-slots/lesson-slots.module";
import { NoteDocumentsModule } from "./modules/note-documents/note-documents.module";
import { NotesUsersModule } from "./modules/notes-users/notes-users.module";
import { PermissionsModule } from "./modules/permissions/permissions.module";
import { PrioritiesModule } from "./modules/priorities/priorities.module";
import { RolesModule } from "./modules/roles/roles.module";
import { StudentsModule } from "./modules/students/students.module";
import { TaskActivityLogModule } from "./modules/task-activity-log/task-activity-log.module";
import { TaskDocumentsModule } from "./modules/task-documents/task-documents.module";
import { TaskMembersModule } from "./modules/task-members/task-members.module";
import { TaskTemplatesModule } from "./modules/task-templates/task-templates.module";
import { TeachersModule } from "./modules/teachers/teachers.module";
import { UserPermissionsModule } from "./modules/user-permissions/user-permissions.module";
import { UserRolesModule } from "./modules/user-roles/user-roles.module";
import { APP_GUARD } from "@nestjs/core";
import { SubjectsModule } from './modules/subjects/subjects.module';
import { WebsocketModule } from './modules/websocket/websocket.module';
import { MetricsModule } from './modules/metrics/metrics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
      // E2E runs take their whole environment from .env.test
      // (test/setup/test-env.ts); keys missing there must not come from .env
      ignoreEnvFile: process.env.NODE_ENV === "test",
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
    TaskActivityModule,
    TemplatesModule,
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
    ClassesTeachersModule,
    DocumentSharesModule,
    LessonSlotsModule,
    NoteDocumentsModule,
    NotesUsersModule,
    PermissionsModule,
    PrioritiesModule,
    RolesModule,
    RoomsModule,
    StudentsModule,
    TaskActivityLogModule,
    TaskDocumentsModule,
    TaskMembersModule,
    TaskTemplatesModule,
    TeachersModule,
    UserPermissionsModule,
    UserRolesModule,
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
