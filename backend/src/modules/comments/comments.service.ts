import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { CreateCommentDto } from "./dto/create-comment.dto";
import { UpdateCommentDto } from "./dto/update-comment.dto";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCommentDto: CreateCommentDto, userId: number) {
    const { task_id, content } = createCommentDto;

    // Validiere dass der Task existiert
    const task = await this.prisma.tasks.findUnique({
      where: { task_id },
    });

    if (!task) {
      throw new NotFoundException(`Task mit ID ${task_id} nicht gefunden`);
    }

    const comment = await this.prisma.comments.create({
      data: {
        task_id,
        content,
        created_by: userId,
      },
      include: {
        users: {
          select: {
            user_id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
        tasks: true,
      },
    });

    return comment;
  }

  async findAllByTask(taskId: number) {
    const comments = await this.prisma.comments.findMany({
      where: { task_id: taskId },
      include: {
        users: {
          select: {
            user_id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
      },
      orderBy: { created_at: "asc" },
    });

    return comments;
  }

  async findOne(commentId: number) {
    const comment = await this.prisma.comments.findUnique({
      where: { comment_id: commentId },
      include: {
        users: {
          select: {
            user_id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
        tasks: true,
      },
    });

    if (!comment) {
      throw new NotFoundException(
        `Kommentar mit ID ${commentId} nicht gefunden`,
      );
    }

    return comment;
  }

  async update(
    commentId: number,
    updateCommentDto: UpdateCommentDto,
    userId: number,
  ) {
    const comment = await this.prisma.comments.findUnique({
      where: { comment_id: commentId },
    });

    if (!comment) {
      throw new NotFoundException(
        `Kommentar mit ID ${commentId} nicht gefunden`,
      );
    }

    // Nur Creator oder Admin kann Kommentar bearbeiten
    if (comment.created_by !== userId) {
      throw new BadRequestException(
        "Sie können nur Ihre eigenen Kommentare bearbeiten",
      );
    }

    const updated = await this.prisma.comments.update({
      where: { comment_id: commentId },
      data: {
        content: updateCommentDto.content ?? comment.content,
        updated_at: new Date(),
      },
      include: {
        users: {
          select: {
            user_id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
        tasks: true,
      },
    });

    return updated;
  }

  async remove(commentId: number, userId: number) {
    const comment = await this.prisma.comments.findUnique({
      where: { comment_id: commentId },
    });

    if (!comment) {
      throw new NotFoundException(
        `Kommentar mit ID ${commentId} nicht gefunden`,
      );
    }

    // Nur Creator oder Admin kann Kommentar löschen
    if (comment.created_by !== userId) {
      throw new BadRequestException(
        "Sie können nur Ihre eigenen Kommentare löschen",
      );
    }

    const deleted = await this.prisma.comments.delete({
      where: { comment_id: commentId },
    });

    return deleted;
  }
}
