import { Module } from '@nestjs/common';
import { TaskActivityLogController } from './task-activity-log.controller';
import { TaskActivityLogService } from './task-activity-log.service';

@Module({
  controllers: [TaskActivityLogController],
  providers: [TaskActivityLogService]
})
export class TaskActivityLogModule {}
