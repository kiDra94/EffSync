import { Module } from "@nestjs/common";
import { TaskActivityService } from "./lesson-slot.service";
import { TaskActivityController } from "./lesson-slot.controller";

@Module({
  controllers: [TaskActivityController],
  providers: [TaskActivityService],
})
export class TaskActivityModule {}
