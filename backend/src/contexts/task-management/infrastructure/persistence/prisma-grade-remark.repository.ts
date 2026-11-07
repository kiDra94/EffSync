import { Injectable } from "@nestjs/common";
import { PrismaUnitOfWork } from "../../../../shared/infrastructure/prisma/prisma-unit-of-work";
import { GradeRemarkRepository } from "../../application/ports/grade-remark.repository";

const WITH_AUTHOR = {
  users: {
    select: { user_id: true, email: true, firstname: true, lastname: true },
  },
} as const;

/** Grading remarks on Prisma (`task_grade`, decision Q16). */
@Injectable()
export class PrismaGradeRemarkRepository extends GradeRemarkRepository {
  constructor(private readonly unitOfWork: PrismaUnitOfWork) {
    super();
  }

  create(taskId: number, teacherId: number, text: string) {
    return this.unitOfWork.client().task_grade.create({
      data: { task_id: taskId, user_id: teacherId, text },
      include: WITH_AUTHOR,
    });
  }

  findForTask(taskId: number) {
    return this.unitOfWork.client().task_grade.findMany({
      where: { task_id: taskId },
      include: WITH_AUTHOR,
      orderBy: { created_at: "asc" },
    });
  }
}
