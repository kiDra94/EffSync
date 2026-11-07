import { Injectable } from "@nestjs/common";
import { PrismaUnitOfWork } from "../../../../shared/infrastructure/prisma/prisma-unit-of-work";
import { CommentRepository } from "../../application/ports/comment.repository";

const AUTHOR = {
  select: { user_id: true, email: true, firstname: true, lastname: true },
} as const;

/** Discussion comments on Prisma (`comments`, decision Q16). */
@Injectable()
export class PrismaCommentRepository extends CommentRepository {
  constructor(private readonly unitOfWork: PrismaUnitOfWork) {
    super();
  }

  private get db() {
    return this.unitOfWork.client();
  }

  create(taskId: number, userId: number, content: string) {
    return this.db.comments.create({
      data: { task_id: taskId, created_by: userId, content },
    });
  }

  findForTask(taskId: number) {
    return this.db.comments.findMany({
      where: { task_id: taskId },
      include: { users: AUTHOR },
      orderBy: { created_at: "asc" },
    });
  }

  findOne(commentId: number) {
    return this.db.comments.findUnique({ where: { comment_id: commentId } });
  }

  update(commentId: number, content: string) {
    return this.db.comments.update({
      where: { comment_id: commentId },
      data: { content, updated_at: new Date() },
    });
  }

  async delete(commentId: number) {
    await this.db.comments.delete({ where: { comment_id: commentId } });
  }

  findMentionedUser(username: string) {
    return this.db.users.findFirst({
      where: { username: username },
      select: { user_id: true, email: true },
    });
  }

  async wantsMentionMail(userId: number) {
    const preferences = await this.db.email_preferences.findUnique({
      where: { user_id: userId },
    });
    return preferences?.email_on_mention !== false;
  }

  async findUsername(userId: number) {
    const user = await this.db.users.findUnique({
      where: { user_id: userId },
      select: { username: true },
    });
    return user?.username ?? null;
  }

  async findTaskTitle(taskId: number) {
    const task = await this.db.tasks.findUnique({
      where: { task_id: taskId },
      select: { title: true },
    });
    return task ? (task.title ?? "") : null;
  }
}
