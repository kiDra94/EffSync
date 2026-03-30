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
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Permissions } from "../auth/decorators/permissions.decorator";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("departments")
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @Permissions("manage_departments")
  create(@Body() createDepartmentDto: CreateDepartmentDto) {
    return this.departmentsService.create(createDepartmentDto);
  }

  @Get()
  @Permissions()
  findAll() {
    return this.departmentsService.findAll();
  }

  @Get(":id")
  @Permissions()
  findOne(@Param("id") id: string) {
    return this.departmentsService.findOne(+id);
  }

  @Patch(":id")
  @Permissions("manage_departments")
  update(
    @Param("id") id: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
  ) {
    return this.departmentsService.update(+id, updateDepartmentDto);
  }

  @Delete(":id")
  @Permissions("manage_departments")
  remove(@Param("id") id: string) {
    return this.departmentsService.remove(+id);
  }
}
