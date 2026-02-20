import { Module } from "@nestjs/common";
import { TaskDocumentsController } from "./task-documents.controller";
import { TaskDocumentsService } from "./task-documents.service";

@Module({
  controllers: [TaskDocumentsController],
  providers: [TaskDocumentsService],
})
export class TaskDocumentsModule {}
