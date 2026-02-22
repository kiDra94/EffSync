import { Module } from "@nestjs/common";
import { TaskCommentsService } from "./task-comments.service";
import { TaskCommentsController } from "./task-comments.controller";
import { PrismaModule } from "../../prisma/prisma.module";
import { EmailModule } from "../email/email.module";

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [TaskCommentsController],
  providers: [TaskCommentsService],
})
export class TaskCommentsModule {}
