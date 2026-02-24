import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTaskActivityLogDto } from './dto/create-task-activity-log.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TaskActivityLogService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createTaskActivityLogDto: CreateTaskActivityLogDto, userId: number, includeRelations = true) {
    const task = await this.taskGuard(createTaskActivityLogDto)

    return this.prisma.task_activity_log.create({
      data: {
        ...createTaskActivityLogDto,
        user_id: userId,
      },
      include: includeRelations ? this.basicInclude() : undefined,
    })
  }

  async findAll(taskId: number, includeRelations = true) {
    await this.taskGuard(taskId);
    return await this.prisma.task_activity_log.findMany({
      where: taskId ? { task_id: taskId } : undefined,
      include: includeRelations ? this.basicInclude() : undefined,
      orderBy: { timestamp: 'desc' }
    });
  }

  async findOne(logId: number, includeRelations = true) {
    const log = await this.prisma.task_activity_log.findUnique({
      where: { log_id: logId },
      include: includeRelations ? this.basicInclude() : undefined,
    });
    if(!log) {
      throw new NotFoundException(`Activity log iwht ID ${logId} not found!`)
    }
    return log;
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
    }
  }

  private async taskGuard(taskId: number): Promise<ReturnType<typeof this.prisma.tasks.findUnique>>;
  private async taskGuard(
    createTaskActivityLogDto: CreateTaskActivityLogDto,
  ): Promise<ReturnType<typeof this.prisma.tasks.findUnique>>;

  private async taskGuard(arg: CreateTaskActivityLogDto | number,
  ): Promise<ReturnType<typeof this.prisma.tasks.findUnique>> {
    const taskId = typeof arg === 'number' ? arg : arg.task_id
    const task = await this.prisma.tasks.findUnique({
      where: { task_id: taskId }
    });
    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found!`);
    };
    return task;
  }
}
