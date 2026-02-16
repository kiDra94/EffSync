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
import { NotesModule } from "./modules/notes/notes.module";
import { SchedulesModule } from "./modules/schedules/schedules.module";
import { ClassesModule } from "./modules/classes/classes.module";
import { DepartmentsModule } from "./modules/departments/departments.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerModule,ThrottlerModuleOptions } from '@nestjs/throttler';
import { UsersModule } from './modules/users/users.module';
import { ChatMessagesModule } from './modules/chat-messages/chat-messages.module';
import { ChatRoomUsersModule } from './modules/chat-room-users/chat-room-users.module';
import { ClassesTeachersModule } from './modules/classes-teachers/classes-teachers.module';
import { DocumentSharesModule } from './modules/document-shares/document-shares.module';
import { LessonSlotsModule } from './modules/lesson-slots/lesson-slots.module';
import { NoteDocumentsModule } from './modules/note-documents/note-documents.module';
import { NotesUsersModule } from './modules/notes-users/notes-users.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { PrioritiesModule } from './modules/priorities/priorities.module';
import { RolesModule } from './modules/roles/roles.module';
import { RolesPermissionsModule } from './modules/roles-permissions/roles-permissions.module';
import { StudentsModule } from './modules/students/students.module';
import { TaskActivityLogModule } from './modules/task-activity-log/task-activity-log.module';
import { TaskDocumentsModule } from './modules/task-documents/task-documents.module';
import { TaskTemplatesModule } from './modules/task-templates/task-templates.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { UserPermissionsModule } from './modules/user-permissions/user-permissions.module';
import { UserRolesModule } from './modules/user-roles/user-roles.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
      cache: true,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): ThrottlerModuleOptions => ({
        throttlers: [
        {
          ttl: config.get<number>('THROTTLE_TTL')|| 60000,
          limit: config.get<number>('THROTTLE_LIMIT')|| 10,
        },
      ],
    }),
    }),
    AuthModule,
    TasksModule,
    TaskCommentsModule,
    TaskActivityModule,
    TemplatesModule,
    DocumentsModule,
    ChatRoomsModule,
    NotificationsModule,
    NotesModule,
    SchedulesModule,
    ClassesModule,
    DepartmentsModule,
    PrismaModule,
    ChatRoomUsersModule,
    ClassesTeachersModule,
    DocumentSharesModule,
    LessonSlotsModule,
    NoteDocumentsModule,
    NotesUsersModule,
    PermissionsModule,
    PrioritiesModule,
    RolesModule,
    RolesPermissionsModule,
    StudentsModule,
    TaskActivityLogModule,
    TaskDocumentsModule,
    TaskTemplatesModule,
    TeachersModule,
    UserPermissionsModule,
    UserRolesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
