import { Module } from "@nestjs/common";
import { TaskActivityLogService } from "./task-activity-log.service";
import { TaskActivityLogController } from "./task-activity-log.controller";
import { PrismaModule } from "../../shared/infrastructure/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [TaskActivityLogController],
  providers: [TaskActivityLogService],
  exports: [TaskActivityLogService],
})
export class TaskActivityLogModule {}
