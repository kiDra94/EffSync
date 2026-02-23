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
import { TaskCommentsService } from "./task-comments.service";
import { CreateTaskCommentDto } from "./dto/create-task-comment.dto";
import { UpdateTaskCommentDto } from "./dto/update-task-comment.dto";

@Controller("task-comments")
export class TaskCommentsController {
  constructor(private readonly taskCommentsService: TaskCommentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() createTaskCommentDto: CreateTaskCommentDto,
    @Req() req: any,
  ) {
    const userId = (req.user as any)?.user_id;
    return await this.taskCommentsService.create({
      ...createTaskCommentDto,
      user_id: userId,
    });
  }

  @Get()
  async findAll() {
    return await this.taskCommentsService.findAll();
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return await this.taskCommentsService.findOne(+id);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  async update(
    @Param("id") id: string,
    @Body() updateTaskCommentDto: UpdateTaskCommentDto,
  ) {
    return await this.taskCommentsService.update(+id, updateTaskCommentDto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  async remove(@Param("id") id: string) {
    return await this.taskCommentsService.remove(+id);
  }
}
