import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import { PermissionFlag } from "../../identity-access/application";
import {
  JwtAuthGuard,
  Permissions,
  PermissionsGuard,
} from "../../../shared/presentation/security";
import type { AuthenticatedRequest } from "../../../shared/presentation/security";
import { ClassesService } from "../application/classes.service";
import {
  ReplaceClassStudentsDto,
  ReplaceClassTeachersDto,
} from "./dto/class-members.dto";
import { CreateClassDto } from "./dto/create-class.dto";
import { UpdateClassDto } from "./dto/update-class.dto";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("classes")
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @Permissions("manage_classes", PermissionFlag.WRITE)
  create(@Body() createClassDto: CreateClassDto) {
    return this.classesService.create(createClassDto);
  }

  @Get()
  @Permissions("view_schedules")
  findAll() {
    return this.classesService.findAll();
  }

  /** The students and teachers a class can get (names only; staff only). */
  @Get("assignable")
  @Permissions("view_schedules")
  findAssignable(@Req() req: AuthenticatedRequest) {
    return this.classesService.findAssignable(req.user.userId);
  }

  @Get(":id")
  @Permissions("view_schedules")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.classesService.findOne(id);
  }

  @Patch(":id")
  @Permissions("manage_classes", PermissionFlag.WRITE)
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateClassDto: UpdateClassDto,
  ) {
    return this.classesService.update(id, updateClassDto);
  }

  @Delete(":id")
  @Permissions("manage_classes", PermissionFlag.EXECUTE)
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.classesService.remove(id);
  }

  // decision D2, UC-20: manage_classes, or a teacher of this class (checked
  // in the use case)
  @Put(":id/students")
  @Permissions("view_schedules")
  replaceStudents(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ReplaceClassStudentsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.classesService.replaceStudents(
      id,
      dto.student_ids,
      req.user.userId,
    );
  }

  @Put(":id/teachers")
  @Permissions("view_schedules")
  replaceTeachers(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ReplaceClassTeachersDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.classesService.replaceTeachers(
      id,
      dto.teacher_ids,
      req.user.userId,
    );
  }
}
