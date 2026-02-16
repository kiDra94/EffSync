import { Module } from '@nestjs/common';
import { LessonSlotsController } from './lesson-slots.controller';
import { LessonSlotsService } from './lesson-slots.service';

@Module({
  controllers: [LessonSlotsController],
  providers: [LessonSlotsService]
})
export class LessonSlotsModule {}
