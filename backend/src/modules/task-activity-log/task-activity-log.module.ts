import { Module } from '@nestjs/common';
import { TaskActivityLogService } from './task-activity-log.service';
import { TaskActivityLogController } from './task-activity-log.controller';

@Module({
  controllers: [TaskActivityLogController],
  providers: [TaskActivityLogService],
})
export class TaskActivityLogModule {}
