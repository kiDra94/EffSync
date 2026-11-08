import type { Prisma } from "@prisma/client";

type TaskTemplateRecord = Prisma.task_templatesGetPayload<object>;

/** What a template stores (decision H2): a name and a description. */
export interface TaskTemplateFields {
  name?: string;
  description?: string;
}

/** Task templates (port; Prisma in infrastructure). Private per author (decision E1). */
export abstract class TaskTemplateRepository {
  abstract create(
    fields: TaskTemplateFields,
    userId: number,
  ): Promise<TaskTemplateRecord>;
  abstract findAllOf(userId: number): Promise<TaskTemplateRecord[]>;
  /** The template with its author and the tasks created from it. */
  abstract findOne(templateId: number): Promise<TaskTemplateRecord | null>;
  /** Only the author, for the ownership checks. */
  abstract findAuthor(
    templateId: number,
  ): Promise<{ created_by: number } | null>;
  abstract update(
    templateId: number,
    fields: TaskTemplateFields,
  ): Promise<TaskTemplateRecord>;
  /** Tasks created from the template keep everything but the link. */
  abstract detachTasks(templateId: number): Promise<void>;
  abstract delete(templateId: number): Promise<void>;
}
