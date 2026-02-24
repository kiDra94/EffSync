import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EmailService } from './email.service';
import { EmailCronService } from './email-cron.service';
import { EmailPreferencesController } from './email-preferences.controller';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [EmailService, EmailCronService, PrismaService],
  exports: [EmailService, EmailCronService],
  controllers: [EmailPreferencesController],
})
export class EmailModule {}
