import { Module } from "@nestjs/common";
import { TasksService } from "./tasks.service";
import { TasksController } from "./tasks.controller";
import { PrismaModule } from "../../shared/infrastructure/prisma/prisma.module";
import { WebsocketModule } from "../websocket/websocket.module";
import { TaskActivityLogModule } from "../task-activity-log/task-activity-log.module";

@Module({
  imports: [PrismaModule, WebsocketModule, TaskActivityLogModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
