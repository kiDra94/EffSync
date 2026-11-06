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
import { CommentsService } from "./comments.service";
import { CreateCommentDto } from "./dto/create-comment.dto";
import { UpdateCommentDto } from "./dto/update-comment.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Permissions } from "../auth/decorators/permissions.decorator";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("comments")
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @Permissions()
  create(@Body() createCommentDto: CreateCommentDto, @Req() req) {
    return this.commentsService.create(createCommentDto, req.user.userId);
  }

  @Get("task/:taskId")
  @Permissions()
  findAllByTask(@Param("taskId") taskId: string) {
    return this.commentsService.findAllByTask(+taskId);
  }

  @Get(":id")
  @Permissions()
  findOne(@Param("id") id: string) {
    return this.commentsService.findOne(+id);
  }

  @Patch(":id")
  @Permissions()
  update(
    @Param("id") id: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @Req() req,
  ) {
    return this.commentsService.update(+id, updateCommentDto, req.user.userId);
  }

  @Delete(":id")
  @Permissions()
  remove(@Param("id") id: string, @Req() req) {
    return this.commentsService.remove(+id, req.user.userId);
  }
}
