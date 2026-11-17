import { Injectable } from "@nestjs/common";
import { PrismaUnitOfWork } from "../../../../shared/infrastructure/prisma/prisma-unit-of-work";
import {
  TaskTemplateFields,
  TaskTemplateRepository,
} from "../../application/ports/task-template.repository";

// the author's name, no e-mail (decision E1)
const AUTHOR = {
  user: { select: { user_id: true, firstname: true, lastname: true } },
} as const;

/** Task templates on Prisma (M18: the include fixed, name and description only). */
@Injectable()
export class PrismaTaskTemplateRepository extends TaskTemplateRepository {
  constructor(private readonly unitOfWork: PrismaUnitOfWork) {
    super();
  }

  private get db() {
    return this.unitOfWork.client();
  }

  create(fields: TaskTemplateFields, userId: number) {
    return this.db.task_templates.create({
      data: { ...fields, created_by: userId },
      include: AUTHOR,
    });
  }

  findAllOf(userId: number) {
    return this.db.task_templates.findMany({
      where: { created_by: userId },
      include: AUTHOR,
      orderBy: { created_at: "desc" },
    });
  }

  findOne(templateId: number) {
    return this.db.task_templates.findUnique({
      where: { template_id: templateId },
      include: {
        ...AUTHOR,
        tasks: { select: { task_id: true, title: true, created_at: true } },
      },
    });
  }

  findAuthor(templateId: number) {
    return this.db.task_templates.findUnique({
      where: { template_id: templateId },
      select: { created_by: true },
    });
  }

  update(templateId: number, fields: TaskTemplateFields) {
    return this.db.task_templates.update({
      where: { template_id: templateId },
      data: { ...fields, updated_at: new Date() },
      include: AUTHOR,
    });
  }

  async detachTasks(templateId: number) {
    await this.db.tasks.updateMany({
      where: { template_id: templateId },
      data: { template_id: null },
    });
  }

  async delete(templateId: number) {
    await this.db.task_templates.delete({ where: { template_id: templateId } });
  }
}
