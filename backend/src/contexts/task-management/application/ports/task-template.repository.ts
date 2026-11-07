import type { Prisma } from "@prisma/client";
import type { TaskRecord } from "./task-records";

type TaskTemplateRecord = Prisma.task_templatesGetPayload<object>;

/** The fields of CreateTaskTemplateDto; the `default_*` ones aren't columns yet (M18). */
export interface TaskTemplateFields {
  name?: string;
  description?: string;
  default_title?: string;
  default_description?: string;
  default_status?: NonNullable<TaskRecord["status"]>;
}

/**
 * Task templates (port); the queries TaskTemplatesService made before M15.
 * Their include selects columns that don't exist, so they answer 500 until
 * M18 step 3 fixes them (and adds decision E1's privacy).
 */
export abstract class TaskTemplateRepository {
  abstract create(
    fields: TaskTemplateFields,
    userId: number,
    includeRelations: boolean,
  ): Promise<TaskTemplateRecord>;
  abstract findAll(
    createdBy: number | undefined,
    includeRelations: boolean,
  ): Promise<TaskTemplateRecord[]>;
  abstract findOne(
    templateId: number,
    includeRelations: boolean,
  ): Promise<TaskTemplateRecord | null>;
  abstract update(
    templateId: number,
    fields: TaskTemplateFields,
    includeRelations: boolean,
  ): Promise<TaskTemplateRecord>;
  abstract countTasksFrom(templateId: number): Promise<number>;
  abstract delete(templateId: number): Promise<void>;
}
