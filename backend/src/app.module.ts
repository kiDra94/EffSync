import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { TaskCommentsModule } from './modules/task-comments/task-comments.module';
import { TaskActivityModule } from './modules/task-activity/task-activity.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { ChatRoomsModule } from './modules/chat-rooms/chat-rooms.module';
import { ChatMessagesModule } from './modules/chat-messages/chat-messages.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { NotesModule } from './modules/notes/notes.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { ClassesModule } from './modules/classes/classes.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [AuthModule, UsersModule, TasksModule, TaskCommentsModule, TaskActivityModule, TemplatesModule, DocumentsModule, ChatRoomsModule, ChatMessagesModule, NotificationsModule, NotesModule, SchedulesModule, ClassesModule, DepartmentsModule, PrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
