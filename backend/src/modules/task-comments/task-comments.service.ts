import { Injectable, Inject } from "@nestjs/common";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { CreateTaskCommentDto } from "./dto/create-task-comment.dto";
import { UpdateTaskCommentDto } from "./dto/update-task-comment.dto";

@Injectable()
export class TaskCommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Detect @mentions in comment text
   * Extracts usernames mentioned with @ symbol
   */
  private detectMentions(text: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]); // Extract username without @
    }

    return [...new Set(mentions)]; // Remove duplicates
  }

  /**
   * Send email notifications to mentioned users
   */
  private async notifyMentionedUsers(
    text: string,
    commenterName: string,
    taskTitle: string,
    taskId: number,
    commenterUserId: number,
  ) {
    const mentionedUsernames = this.detectMentions(text);

    if (mentionedUsernames.length === 0) return;

    // Find user IDs for mentioned usernames
    for (const username of mentionedUsernames) {
      try {
        const mentionedUser = await this.prisma.users.findFirst({
          where: { username: username },
          select: { user_id: true, email: true },
        });

        if (mentionedUser && mentionedUser.user_id !== commenterUserId) {
          // Check user's email preferences
          const preferences = await this.prisma.email_preferences.findUnique({
            where: { user_id: mentionedUser.user_id },
          });

          // Send email if user has email_on_mention enabled
          if (preferences?.email_on_mention !== false) {
            const commentExcerpt = text.substring(0, 200);
            await this.emailService.sendMentionEmail(
              mentionedUser.user_id,
              mentionedUser.email,
              commenterName,
              taskTitle,
              commentExcerpt,
            );
          }
        }
      } catch (error) {
        console.error(`Error notifying mentioned user ${username}:`, error);
        // Continue with other mentions even if one fails
      }
    }
  }

  async create(
    createTaskCommentDto: CreateTaskCommentDto & { user_id: number },
  ) {
    // Create the comment
    const comment = await this.prisma.task_comments.create({
      data: {
        task_id: createTaskCommentDto.task_id,
        user_id: createTaskCommentDto.user_id,
        text: createTaskCommentDto.text,
      },
    });

    // Fetch task info for mention notifications
    let taskTitle = "Task";
    let commenterName = "User";

    if (comment.text) {
      try {
        // Get commenter info
        const commenter = await this.prisma.users.findUnique({
          where: { user_id: createTaskCommentDto.user_id },
          select: { username: true },
        });
        if (commenter) commenterName = commenter.username;

        // Get task info
        if (comment.task_id) {
          const task = await this.prisma.tasks.findUnique({
            where: { task_id: comment.task_id },
            select: { title: true },
          });
          if (task) taskTitle = task.title || "Task";
        }

        // Handle @mentions for email notifications
        await this.notifyMentionedUsers(
          comment.text,
          commenterName,
          taskTitle,
          comment.task_id || 0,
          createTaskCommentDto.user_id,
        );
      } catch (error) {
        console.error("Error processing mentions:", error);
        // Don't fail the comment creation if mention handling fails
      }
    }

    return comment;
  }

  async findAll() {
    return await this.prisma.task_comments.findMany({
      include: {
        users: { select: { username: true, firstname: true, lastname: true } },
      },
      orderBy: { created_at: "desc" },
    });
  }

  async findOne(id: number) {
    return await this.prisma.task_comments.findUnique({
      where: { comment_id: id },
      include: {
        users: true,
      },
    });
  }

  async update(id: number, updateTaskCommentDto: UpdateTaskCommentDto) {
    return await this.prisma.task_comments.update({
      where: { comment_id: id },
      data: updateTaskCommentDto,
      include: {
        users: true,
        tasks: true,
      },
    });
  }

  async remove(id: number) {
    return await this.prisma.task_comments.delete({
      where: { comment_id: id },
    });
  }
}
