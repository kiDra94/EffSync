import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CommentRepository } from "./ports/comment.repository";
import { MentionMailer } from "./ports/mention-mailer";

/**
 * Discussion comments on a task (decision Q16: the `comments` table) with
 * the @mention mail (T09), moved from task-comments.service.ts.
 */
@Injectable()
export class CommentsService {
  constructor(
    private readonly comments: CommentRepository,
    private readonly mailer: MentionMailer,
  ) {}

  /** The usernames mentioned with @ in a comment, without duplicates. */
  private detectMentions(text: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    return [...new Set(mentions)];
  }

  /** Mails every mentioned user except the commenter, if they want mention mails. */
  private async notifyMentionedUsers(
    text: string,
    commenterName: string,
    taskTitle: string,
    taskId: number,
    commenterUserId: number,
  ) {
    for (const username of this.detectMentions(text)) {
      try {
        const mentionedUser = await this.comments.findMentionedUser(username);
        if (
          mentionedUser &&
          mentionedUser.user_id !== commenterUserId &&
          (await this.comments.wantsMentionMail(mentionedUser.user_id))
        ) {
          await this.mailer.sendMentionEmail(
            mentionedUser.user_id,
            mentionedUser.email,
            commenterName,
            taskTitle,
            text.substring(0, 200),
          );
        }
      } catch (error) {
        // the other mentions still get their mail
        console.error(`Error notifying mentioned user ${username}:`, error);
      }
    }
  }

  async create(taskId: number, userId: number, content: string) {
    const title = await this.comments.findTaskTitle(taskId);
    if (title === null) {
      throw new NotFoundException(`Task with ID ${taskId} not found!`);
    }
    const comment = await this.comments.create(taskId, userId, content);

    if (comment.content) {
      try {
        const commenterName =
          (await this.comments.findUsername(userId)) ?? "User";
        const taskTitle = title || "Task";
        await this.notifyMentionedUsers(
          comment.content,
          commenterName,
          taskTitle,
          comment.task_id || 0,
          userId,
        );
      } catch (error) {
        // the comment stays even if the mention mail fails
        console.error("Error processing mentions:", error);
      }
    }
    return comment;
  }

  /** Only the author changes or deletes a comment. */
  async update(
    taskId: number,
    commentId: number,
    userId: number,
    content: string,
  ) {
    await this.ownComment(taskId, commentId, userId);
    return this.comments.update(commentId, content);
  }

  async remove(taskId: number, commentId: number, userId: number) {
    await this.ownComment(taskId, commentId, userId);
    await this.comments.delete(commentId);
  }

  private async ownComment(taskId: number, commentId: number, userId: number) {
    const comment = await this.comments.findOne(commentId);
    if (!comment || comment.task_id !== taskId) {
      throw new NotFoundException(`Comment ${commentId} not found`);
    }
    if (comment.created_by !== userId) {
      throw new ForbiddenException("Only the author may change this comment");
    }
    return comment;
  }
}
