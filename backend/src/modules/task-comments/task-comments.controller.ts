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
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { TaskCommentsService } from "./task-comments.service";
import { CreateTaskCommentDto } from "./dto/create-task-comment.dto";
import { UpdateTaskCommentDto } from "./dto/update-task-comment.dto";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("task-comments")
export class TaskCommentsController {
  constructor(private readonly taskCommentsService: TaskCommentsService) {}

  @Post()
  @Permissions()
  async create(
    @Body() createTaskCommentDto: CreateTaskCommentDto,
    @Req() req: any,
  ) {
    const userId = req.user?.userId ?? req.user?.id;
    return await this.taskCommentsService.create({
      ...createTaskCommentDto,
      user_id: userId,
    });
  }

  @Get()
  @Permissions()
  async findAll() {
    return await this.taskCommentsService.findAll();
  }

  @Get(":id")
  @Permissions()
  async findOne(@Param("id") id: string) {
    return await this.taskCommentsService.findOne(+id);
  }

  @Patch(":id")
  @Permissions()
  async update(
    @Param("id") id: string,
    @Body() updateTaskCommentDto: UpdateTaskCommentDto,
  ) {
    return await this.taskCommentsService.update(+id, updateTaskCommentDto);
  }

  @Delete(":id")
  @Permissions()
  async remove(@Param("id") id: string) {
    return await this.taskCommentsService.remove(+id);
  }
}
