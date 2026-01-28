import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { TaskCommentsModule } from './modules/task-comments/task-comments.module';

@Module({
  imports: [AuthModule, UsersModule, TasksModule, TaskCommentsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
