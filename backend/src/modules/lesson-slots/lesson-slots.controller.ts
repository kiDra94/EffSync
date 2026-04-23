import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from "@nestjs/common";
import { LessonSlotService } from "./lesson-slots.service";
import { CreateLessonSlotDto } from "./dto/create-lesson-slots.dto";
import { UpdateLessonSlotDto } from "./dto/update-lesson-slots.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Permissions } from "../auth/decorators/permissions.decorator";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("lesson-slots")
export class LessonSlotController {
  constructor(private readonly lessonSlotService: LessonSlotService) {}

  @Post()
  @Permissions("manage_schedules")
  create(@Body() createLessonSlotDto: CreateLessonSlotDto) {
    return this.lessonSlotService.create(createLessonSlotDto);
  }

  @Get()
  @Permissions()
  findAll() {
    return this.lessonSlotService.findAll();
  }

  @Get(":id")
  @Permissions()
  findOne(@Param("id") id: string) {
    return this.lessonSlotService.findOne(+id);
  }

  @Patch(":id")
  @Permissions("manage_schedules")
  update(
    @Param("id") id: string,
    @Body() updateLessonSlotDto: UpdateLessonSlotDto,
  ) {
    return this.lessonSlotService.update(+id, updateLessonSlotDto);
  }

  @Delete(":id")
  @Permissions("manage_schedules")
  remove(@Param("id") id: string) {
    return this.lessonSlotService.remove(+id);
  }
}
