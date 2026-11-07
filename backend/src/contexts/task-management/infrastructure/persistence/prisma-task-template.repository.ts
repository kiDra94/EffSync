import { Injectable } from "@nestjs/common";
import { PrismaUnitOfWork } from "../../../../shared/infrastructure/prisma/prisma-unit-of-work";
import {
  TaskTemplateFields,
  TaskTemplateRepository,
} from "../../application/ports/task-template.repository";

/**
 * Task templates on Prisma: the queries TaskTemplatesService made before
 * M15, unchanged. BUG (M18 step 3): `first_name`/`last_name` and `task` don't
 * exist (the columns are `firstname`/`lastname`, the relation is `tasks`), so
 * Prisma rejects every query that includes them.
 */
function basicInclude(includeTask = false) {
  return {
    user: {
      select: {
        user_id: true,
        email: true,
        first_name: true,
        last_name: true,
      },
    },
    task: includeTask
      ? { select: { task_id: true, title: true, created_at: true } }
      : undefined,
  } as never;
}

@Injectable()
export class PrismaTaskTemplateRepository extends TaskTemplateRepository {
  constructor(private readonly unitOfWork: PrismaUnitOfWork) {
    super();
  }

  private get db() {
    return this.unitOfWork.client();
  }

  create(
    fields: TaskTemplateFields,
    userId: number,
    includeRelations: boolean,
  ) {
    return this.db.task_templates.create({
      data: { ...fields, created_by: userId } as never,
      include: includeRelations ? basicInclude() : undefined,
    });
  }

  findAll(createdBy: number | undefined, includeRelations: boolean) {
    return this.db.task_templates.findMany({
      where: createdBy ? { created_by: createdBy } : undefined,
      include: includeRelations ? basicInclude() : undefined,
      orderBy: { created_at: "desc" },
    });
  }

  findOne(templateId: number, includeRelations: boolean) {
    return this.db.task_templates.findUnique({
      where: { template_id: templateId },
      include: includeRelations ? basicInclude(true) : undefined,
    });
  }

  update(
    templateId: number,
    fields: TaskTemplateFields,
    includeRelations: boolean,
  ) {
    return this.db.task_templates.update({
      where: { template_id: templateId },
      data: { ...fields, updated_at: new Date() } as never,
      include: includeRelations ? basicInclude() : undefined,
    });
  }

  countTasksFrom(templateId: number) {
    return this.db.tasks.count({ where: { template_id: templateId } });
  }

  async delete(templateId: number) {
    await this.db.task_templates.delete({
      where: { template_id: templateId },
    });
  }
}
