import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { EmailService } from "./email.service";
import { EmailCronService } from "./email-cron.service";
import { EmailPreferencesController } from "./email-preferences.controller";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { TasksModule } from "../tasks/tasks.module";

@Module({
  imports: [ScheduleModule.forRoot(), NotificationsModule, TasksModule],
  providers: [EmailService, EmailCronService, PrismaService],
  exports: [EmailService, EmailCronService],
  controllers: [EmailPreferencesController],
})
export class EmailModule {}
