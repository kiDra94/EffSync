import { Injectable, NotFoundException } from "@nestjs/common";
import { UnitOfWork } from "../../../shared/application/unit-of-work";
import {
  TaskTemplateFields,
  TaskTemplateRepository,
} from "./ports/task-template.repository";

/**
 * Task templates (T110, 07_…:221-225): a task saved as a name and a
 * description (decision H2), private to its author (decision E1).
 */
@Injectable()
export class TaskTemplatesService {
  constructor(
    private readonly templates: TaskTemplateRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  create(fields: TaskTemplateFields, userId: number) {
    return this.templates.create(
      { name: fields.name, description: fields.description },
      userId,
    );
  }

  findAll(userId: number) {
    return this.templates.findAllOf(userId);
  }

  /** The author's template; someone else's is a 404 like a missing one. */
  async findOne(templateId: number, userId: number) {
    const template = await this.templates.findOne(templateId);
    if (!template || template.created_by !== userId) {
      throw new NotFoundException(
        `Task-Template with ID ${templateId} not found!`,
      );
    }
    return template;
  }

  /** 404 unless the template is the user's (E1); reads only the author. */
  async assertOwner(templateId: number, userId: number) {
    const template = await this.templates.findAuthor(templateId);
    if (!template || template.created_by !== userId) {
      throw new NotFoundException(
        `Task-Template with ID ${templateId} not found!`,
      );
    }
  }

  async update(templateId: number, userId: number, fields: TaskTemplateFields) {
    await this.assertOwner(templateId, userId);
    return this.templates.update(templateId, {
      ...(fields.name !== undefined && { name: fields.name }),
      ...(fields.description !== undefined && {
        description: fields.description,
      }),
    });
  }

  async remove(templateId: number, userId: number) {
    await this.assertOwner(templateId, userId);
    await this.unitOfWork.run(async () => {
      await this.templates.detachTasks(templateId);
      await this.templates.delete(templateId);
    });
    return {
      message: "Template deleted successfully",
      template_id: templateId,
    };
  }
}
