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
import { SubjectsService } from "../application/subjects.service";
import { CreateSubjectDto } from "./dto/create-subject.dto";
import { UpdateSubjectDto } from "./dto/update-subject.dto";
import {
  JwtAuthGuard,
  PermissionsGuard,
  Permissions,
} from "../../../shared/presentation/security";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("subjects")
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Post()
  @Permissions("manage_classes", PermissionFlag.WRITE)
  create(@Body() createSubjectDto: CreateSubjectDto) {
    return this.subjectsService.create(createSubjectDto);
  }

  @Get()
  @Permissions("view_schedules")
  findAll() {
    return this.subjectsService.findAll();
  }

  @Get(":id")
  @Permissions("view_schedules")
  findOne(@Param("id") id: string) {
    return this.subjectsService.findOne(+id);
  }

  @Patch(":id")
  @Permissions("manage_classes", PermissionFlag.WRITE)
  update(@Param("id") id: string, @Body() updateSubjectDto: UpdateSubjectDto) {
    return this.subjectsService.update(+id, updateSubjectDto);
  }

  @Delete(":id")
  @Permissions("manage_classes", PermissionFlag.EXECUTE)
  remove(@Param("id") id: string) {
    return this.subjectsService.remove(+id);
  }
}
