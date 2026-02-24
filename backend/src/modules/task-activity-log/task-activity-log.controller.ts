import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TaskActivityLogService } from './task-activity-log.service';
import { CreateTaskActivityLogDto } from './dto/create-task-activity-log.dto';
import { UpdateTaskActivityLogDto } from './dto/update-task-activity-log.dto';

@Controller('task-activity-log')
export class TaskActivityLogController {
  constructor(private readonly taskActivityLogService: TaskActivityLogService) {}

  @Post()
  create(@Body() createTaskActivityLogDto: CreateTaskActivityLogDto) {
    return this.taskActivityLogService.create(createTaskActivityLogDto);
  }

  @Get()
  findAll() {
    return this.taskActivityLogService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.taskActivityLogService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTaskActivityLogDto: UpdateTaskActivityLogDto) {
    return this.taskActivityLogService.update(+id, updateTaskActivityLogDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.taskActivityLogService.remove(+id);
  }
}
