import type { Prisma } from "@prisma/client";

type GradeRemarkWithAuthor = Prisma.task_gradeGetPayload<{
  include: {
    users: {
      select: { user_id: true; email: true; firstname: true; lastname: true };
    };
  };
}>;

/** Teachers' grading remarks on a task (port; `task_grade`, decision Q16). */
export abstract class GradeRemarkRepository {
  abstract create(
    taskId: number,
    teacherId: number,
    text: string,
  ): Promise<GradeRemarkWithAuthor>;
  abstract findForTask(taskId: number): Promise<GradeRemarkWithAuthor[]>;
}
