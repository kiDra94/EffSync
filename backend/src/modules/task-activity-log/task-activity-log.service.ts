import { Injectable } from '@nestjs/common';
import { CreateTaskActivityLogDto } from './dto/create-task-activity-log.dto';
import { UpdateTaskActivityLogDto } from './dto/update-task-activity-log.dto';

@Injectable()
export class TaskActivityLogService {
  create(createTaskActivityLogDto: CreateTaskActivityLogDto) {
    return 'This action adds a new taskActivityLog';
  }

  findAll() {
    return `This action returns all taskActivityLog`;
  }

  findOne(id: number) {
    return `This action returns a #${id} taskActivityLog`;
  }

  update(id: number, updateTaskActivityLogDto: UpdateTaskActivityLogDto) {
    return `This action updates a #${id} taskActivityLog`;
  }

  remove(id: number) {
    return `This action removes a #${id} taskActivityLog`;
  }
}
