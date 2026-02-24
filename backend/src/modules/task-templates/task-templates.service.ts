import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTaskTemplateDto } from './dto/create-task-template.dto';
import { UpdateTaskTemplateDto } from './dto/update-task-template.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TaskTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTaskTemplateDto: CreateTaskTemplateDto, userId : number, includeRelations = true) {
    return await this.prisma.task_templates.create({
      data: {
        ...createTaskTemplateDto,
        created_by: userId
      },
      include: includeRelations ? this.basicInclude() : undefined,
    });
  }

  async findAll(createdBy: number, includeRelations = true) {
    return await this.prisma.task_templates.findMany({
      where: createdBy ? { created_by: createdBy} : undefined,
      include: includeRelations ? this.basicInclude() : undefined,
      orderBy: { created_at: 'desc'},
    });
  }

  async findOne(templateId: number, includeRelations = true) {
    const task_template = await this.prisma.task_templates.findUnique({
      where: { template_id: templateId},
      include: includeRelations ? this.basicInclude(true) : undefined,
    });
    if(!task_template) {
      throw new NotFoundException (`Task-Template with ID ${templateId} not found!`);
    }
    return task_template;
  }

  async update(templateId: number, updateTaskTemplateDto: UpdateTaskTemplateDto, includeRelations = true) {
    await this.findOne(templateId);
    return await this.prisma.task_templates.update({
      where: { template_id: templateId },
      data: {
        ...updateTaskTemplateDto,
        updated_at: new Date(),
      },
      include: includeRelations ? this.basicInclude() : undefined,
    })
  }
  //TODO: eventuelles refactorn das man templates losschen kann obwohl es task gibt die damti gemacht worden sind
  async remove(templateId: number) {
    await this.findOne(templateId);
    const tasksCount = await this.prisma.tasks.count({
      where: { template_id: templateId },
    });
    if (tasksCount > 0) {
      throw new NotFoundException(
        `Cannot delete template with ${tasksCount} associated task(s)`,
      );
    }
    await this.prisma.task_templates.delete({
      where: { template_id: templateId },
    });

    return { message: 'Template deleted successfully', template_id: templateId };
  }

  private basicInclude(includeTask = false) {
    return {
      user: {
        select: {
          user_id: true,
          email: true,
          first_name: true,
          last_name: true,
        }
      },
      task: includeTask ? {
        select: {
          task_id: true,
          title: true,
          created_at: true,
        }
      } : undefined
    };
  }
}
