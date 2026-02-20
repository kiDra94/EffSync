import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from "@nestjs/common";
import { LessonSlotService } from "./lesson-slots.service";
import { CreateLessonSlotDto } from "./dto/create-lesson-slots.dto";
import { UpdateLessonSlotDto } from "./dto/update-lesson-slots.dto";

@Controller("lesson-slots")
export class LessonSlotController {
  constructor(private readonly lessonSlotService: LessonSlotService) {}

  @Post()
  create(@Body() createLessonSlotDto: CreateLessonSlotDto) {
    return this.lessonSlotService.create(createLessonSlotDto);
  }

  @Get()
  findAll() {
    return this.lessonSlotService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.lessonSlotService.findOne(+id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updateLessonSlotDto: UpdateLessonSlotDto,
  ) {
    return this.lessonSlotService.update(+id, updateLessonSlotDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.lessonSlotService.remove(+id);
  }
}
