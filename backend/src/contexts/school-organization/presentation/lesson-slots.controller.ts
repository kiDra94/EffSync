import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { PermissionFlag } from "../../identity-access/application";
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
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

@ApiTags("lesson-slots")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Kein oder ungültiges Token" })
@ApiForbiddenResponse({ description: "Fehlende Rolle oder Berechtigung" })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("lesson-slots")
export class LessonSlotController {
  constructor(private readonly lessonSlotService: LessonSlotService) {}

  @ApiOperation({ summary: "Create a lesson slot" })
  @Post()
  @Permissions("manage_classes", PermissionFlag.WRITE)
  create(@Body() createLessonSlotDto: CreateLessonSlotDto) {
    return this.lessonSlotService.create(createLessonSlotDto);
  }

  @ApiOperation({ summary: "List the lesson slots" })
  @Get()
  @Permissions("view_schedules")
  findAll() {
    return this.lessonSlotService.findAll();
  }

  @ApiOperation({ summary: "One lesson slot" })
  @Get(":id")
  @Permissions("view_schedules")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.lessonSlotService.findOne(id);
  }

  @ApiOperation({ summary: "Change a lesson slot" })
  @Patch(":id")
  @Permissions("manage_classes", PermissionFlag.WRITE)
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateLessonSlotDto: UpdateLessonSlotDto,
  ) {
    return this.lessonSlotService.update(id, updateLessonSlotDto);
  }

  @ApiOperation({ summary: "Delete a lesson slot" })
  @Delete(":id")
  @Permissions("manage_classes", PermissionFlag.EXECUTE)
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.lessonSlotService.remove(id);
  }
}
