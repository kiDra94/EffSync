import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from "@nestjs/common";
import { TaskActivityService } from "./lesson-slot.service";
import { CreateTaskActivityDto } from "./dto/create-lesson-slot.dto";
import { UpdateTaskActivityDto } from "./dto/update-lesson-slot.dto";

@Controller("task-activity")
export class TaskActivityController {
  constructor(private readonly taskActivityService: TaskActivityService) {}

  @Post()
  create(@Body() createTaskActivityDto: CreateTaskActivityDto) {
    return this.taskActivityService.create(createTaskActivityDto);
  }

  @Get()
  findAll() {
    return this.taskActivityService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.taskActivityService.findOne(+id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updateTaskActivityDto: UpdateTaskActivityDto,
  ) {
    return this.taskActivityService.update(+id, updateTaskActivityDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.taskActivityService.remove(+id);
  }
}
