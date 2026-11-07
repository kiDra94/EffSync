import { Module } from "@nestjs/common";
import { LessonSlotService } from "./lesson-slots.service";
import { LessonSlotController } from "./lesson-slots.controller";
import { PrismaModule } from "../../shared/infrastructure/prisma/prisma.module";
@Module({
  imports: [PrismaModule],
  controllers: [LessonSlotController],
  providers: [LessonSlotService],
})
export class LessonSlotsModule {}
