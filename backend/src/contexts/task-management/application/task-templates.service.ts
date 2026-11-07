import { Injectable, NotFoundException } from "@nestjs/common";
import {
  TaskTemplateFields,
  TaskTemplateRepository,
} from "./ports/task-template.repository";

/** Task templates (T110). Privacy (decision E1) and the field fixes follow in M18. */
@Injectable()
export class TaskTemplatesService {
  constructor(private readonly templates: TaskTemplateRepository) {}

  create(fields: TaskTemplateFields, userId: number, includeRelations = true) {
    return this.templates.create(fields, userId, includeRelations);
  }

  findAll(createdBy?: number, includeRelations = true) {
    return this.templates.findAll(createdBy, includeRelations);
  }

  async findOne(templateId: number, includeRelations = true) {
    const template = await this.templates.findOne(templateId, includeRelations);
    if (!template) {
      throw new NotFoundException(
        `Task-Template with ID ${templateId} not found!`,
      );
    }
    return template;
  }

  async update(
    templateId: number,
    fields: TaskTemplateFields,
    includeRelations = true,
  ) {
    await this.findOne(templateId);
    return this.templates.update(templateId, fields, includeRelations);
  }

  async remove(templateId: number) {
    await this.findOne(templateId);
    const tasksCount = await this.templates.countTasksFrom(templateId);
    if (tasksCount > 0) {
      throw new NotFoundException(
        `Cannot delete template with ${tasksCount} associated task(s)`,
      );
    }
    await this.templates.delete(templateId);
    return {
      message: "Template deleted successfully",
      template_id: templateId,
    };
  }
}
