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
import { ClassesService } from "./classes.service";
import { CreateClassDto } from "./dto/create-class.dto";
import { UpdateClassDto } from "./dto/update-class.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Permissions } from "../auth/decorators/permissions.decorator";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("classes")
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @Permissions("manage_classes")
  create(@Body() createClassDto: CreateClassDto) {
    return this.classesService.create(createClassDto);
  }

  @Get()
  @Permissions()
  findAll() {
    return this.classesService.findAll();
  }

  @Get(":id")
  @Permissions()
  findOne(@Param("id") id: string) {
    return this.classesService.findOne(+id);
  }

  @Patch(":id")
  @Permissions("manage_classes")
  update(@Param("id") id: string, @Body() updateClassDto: UpdateClassDto) {
    return this.classesService.update(+id, updateClassDto);
  }

  @Delete(":id")
  @Permissions("manage_classes")
  remove(@Param("id") id: string) {
    return this.classesService.remove(+id);
  }
}
