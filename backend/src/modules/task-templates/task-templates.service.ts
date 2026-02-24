import { Injectable } from '@nestjs/common';
import { CreateTaskTemplateDto } from './dto/create-task-template.dto';
import { UpdateTaskTemplateDto } from './dto/update-task-template.dto';

@Injectable()
export class TaskTemplatesService {
  create(createTaskTemplateDto: CreateTaskTemplateDto) {
    return 'This action adds a new taskTemplate';
  }

  findAll() {
    return `This action returns all taskTemplates`;
  }

  findOne(id: number) {
    return `This action returns a #${id} taskTemplate`;
  }

  update(id: number, updateTaskTemplateDto: UpdateTaskTemplateDto) {
    return `This action updates a #${id} taskTemplate`;
  }

  remove(id: number) {
    return `This action removes a #${id} taskTemplate`;
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
