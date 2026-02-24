import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTaskActivityLogDto } from './dto/create-task-activity-log.dto';
import { UpdateTaskActivityLogDto } from './dto/update-task-activity-log.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TaskActivityLogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTaskActivityLogDto: CreateTaskActivityLogDto, userId: number, includeRelations = true) {
    const task = await this.prisma.tasks.findUnique({
      where: { task_id: createTaskActivityLogDto.task_id}
    });
    if(!task) {
      throw new NotFoundException(`Task with ID ${createTaskActivityLogDto.task_id} not found!`);
    };

    return this.prisma.task_activity_log.create({
      data: {
        ...createTaskActivityLogDto,
        user_id: userId,
      },
      include: includeRelations ? this.basicInclude() : undefined,
    })
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

  private basicInclude() {
    return {
      users: {
        select: {
          user_id: true,
          email: true,
          first_name: true,
          last_name: true,
        },
      },
      task: {
        select: {
          task_id: true,
          title: true,
        }
      },
      orderBy: { timestamp: 'desc'}
    }
  }
}
