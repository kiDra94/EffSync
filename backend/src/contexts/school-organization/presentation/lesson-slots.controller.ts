import { PermissionFlag } from "../../identity-access/application";
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
import { LessonSlotService } from "../application/lesson-slots.service";
import { CreateLessonSlotDto } from "./dto/create-lesson-slots.dto";
import { UpdateLessonSlotDto } from "./dto/update-lesson-slots.dto";
import {
  JwtAuthGuard,
  PermissionsGuard,
  Permissions,
} from "../../../shared/presentation/security";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("lesson-slots")
export class LessonSlotController {
  constructor(private readonly lessonSlotService: LessonSlotService) {}

  @Post()
  @Permissions("manage_classes", PermissionFlag.WRITE)
  create(@Body() createLessonSlotDto: CreateLessonSlotDto) {
    return this.lessonSlotService.create(createLessonSlotDto);
  }

  @Get()
  @Permissions("view_schedules")
  findAll() {
    return this.lessonSlotService.findAll();
  }

  @Get(":id")
  @Permissions("view_schedules")
  findOne(@Param("id") id: string) {
    return this.lessonSlotService.findOne(+id);
  }

  @Patch(":id")
  @Permissions("manage_classes", PermissionFlag.WRITE)
  update(
    @Param("id") id: string,
    @Body() updateLessonSlotDto: UpdateLessonSlotDto,
  ) {
    return this.lessonSlotService.update(+id, updateLessonSlotDto);
  }

  @Delete(":id")
  @Permissions("manage_classes", PermissionFlag.EXECUTE)
  remove(@Param("id") id: string) {
    return this.lessonSlotService.remove(+id);
  }
}
