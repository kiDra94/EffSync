import { PermissionFlag } from "../../contexts/identity-access/application";
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
import { DepartmentsService } from "./departments.service";
import { CreateDepartmentDto } from "./dto/create-department.dto";
import { UpdateDepartmentDto } from "./dto/update-department.dto";
import {
  JwtAuthGuard,
  PermissionsGuard,
  Permissions,
} from "../../shared/presentation/security";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("departments")
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @Permissions("manage_classes", PermissionFlag.WRITE)
  create(@Body() createDepartmentDto: CreateDepartmentDto) {
    return this.departmentsService.create(createDepartmentDto);
  }

  @Get()
  @Permissions("view_schedules")
  findAll() {
    return this.departmentsService.findAll();
  }

  @Get(":id")
  @Permissions("view_schedules")
  findOne(@Param("id") id: string) {
    return this.departmentsService.findOne(+id);
  }

  @Patch(":id")
  @Permissions("manage_classes", PermissionFlag.WRITE)
  update(
    @Param("id") id: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
  ) {
    return this.departmentsService.update(+id, updateDepartmentDto);
  }

  @Delete(":id")
  @Permissions("manage_classes", PermissionFlag.EXECUTE)
  remove(@Param("id") id: string) {
    return this.departmentsService.remove(+id);
  }
}
