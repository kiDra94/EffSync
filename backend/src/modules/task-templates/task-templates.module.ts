import { Module } from "@nestjs/common";
import { TaskTemplatesService } from "./task-templates.service";
import { TaskTemplatesController } from "./task-templates.controller";
import { PrismaModule } from "../../shared/infrastructure/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [TaskTemplatesController],
  providers: [TaskTemplatesService],
  exports: [TaskTemplatesService],
})
export class TaskTemplatesModule {}
