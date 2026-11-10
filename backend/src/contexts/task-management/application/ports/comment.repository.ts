import type { Prisma } from "@prisma/client";

const author = {
  select: { user_id: true, email: true, firstname: true, lastname: true },
} as const;

type CommentRecord = Prisma.commentsGetPayload<object>;
type CommentWithAuthor = Prisma.commentsGetPayload<{
  include: { users: typeof author };
}>;

/** Discussion comments on a task (port; the `comments` table, decision Q16). */
export abstract class CommentRepository {
  abstract create(
    taskId: number,
    userId: number,
    content: string,
  ): Promise<CommentWithAuthor>;
  abstract findForTask(taskId: number): Promise<CommentWithAuthor[]>;
  abstract findOne(commentId: number): Promise<CommentRecord | null>;
  abstract update(
    commentId: number,
    content: string,
  ): Promise<CommentWithAuthor>;
  abstract delete(commentId: number): Promise<void>;

  // for the @mention mail (T09)
  abstract findMentionedUser(
    username: string,
  ): Promise<{ user_id: number; email: string } | null>;
  abstract wantsMentionMail(userId: number): Promise<boolean>;
  abstract findUsername(userId: number): Promise<string | null>;
  abstract findTaskTitle(taskId: number): Promise<string | null>;
}
