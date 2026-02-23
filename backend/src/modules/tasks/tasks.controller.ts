import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from "@nestjs/common";
import { TasksService } from "./tasks.service";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { QueryTasksDto } from "./dto/query-tasks.dto";

@UseGuards(JwtAuthGuard)
@Controller("tasks")
export class TasksController {
  constructor(private readonly tasksService: TasksService) { }

  @Post()
  create(@Body() createTaskDto: CreateTaskDto, @Req() req) {
    return this.tasksService.create(createTaskDto, req.user.userId);
  }

  @Get()
  findAll(@Query() queryDto: QueryTasksDto) {
    return this.tasksService.findAll(queryDto);
  }

  @Get(":id/tree")
  findTree(@Param("id") id: string) {
    return this.tasksService.findeOneWithSubtasks(+id);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.tasksService.findOne(+id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() updateTaskDto: UpdateTaskDto) {
    return this.tasksService.update(+id, updateTaskDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.tasksService.remove(+id);
  }

  @Post(":id/subtasks")
  createSubTask(@Param("id") id: string, @Body() createTaskDto: CreateTaskDto, @Req() req) {
    return this.tasksService.createSubTask(+id, createTaskDto, req.user.userId);
  }

  @Get(":id/subtasks")
  getSubtasks(@Param("id") id: string) {
    return this.tasksService.getSubtasksOfTask(+id);
  }

  @Get(":id/comments")
  getComments(@Param("id") id: string) {
    return this.tasksService.getComments(+id);
  }

  @Get(":id/activity")
  getActivity(@Param("id") id: string) {
    return this.tasksService.getActivityLog(+id);
  }

  @Get(":id/documents")
  getDocuments(@Param("id") id: string) {
    return this.tasksService.getDocuments(+id);
  }
}