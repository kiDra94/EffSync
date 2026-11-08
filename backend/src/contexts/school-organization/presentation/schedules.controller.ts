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
import { SchedulesService } from "../application/schedules.service";
import { CreateScheduleDto } from "./dto/create-schedule.dto";
import { UpdateScheduleDto } from "./dto/update-schedule.dto";
import {
  JwtAuthGuard,
  PermissionsGuard,
  Permissions,
} from "../../../shared/presentation/security";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("schedules")
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post()
  @Permissions("manage_classes", PermissionFlag.WRITE)
  create(@Body() createScheduleDto: CreateScheduleDto) {
    return this.schedulesService.create(createScheduleDto);
  }

  @Get()
  @Permissions("view_schedules")
  findAll() {
    return this.schedulesService.findAll();
  }

  @Get(":id")
  @Permissions("view_schedules")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.schedulesService.findOne(id);
  }

  @Patch(":id")
  @Permissions("manage_classes", PermissionFlag.WRITE)
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateScheduleDto: UpdateScheduleDto,
  ) {
    return this.schedulesService.update(id, updateScheduleDto);
  }

  @Delete(":id")
  @Permissions("manage_classes", PermissionFlag.EXECUTE)
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.schedulesService.remove(id);
  }
}
