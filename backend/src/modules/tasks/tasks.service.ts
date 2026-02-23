import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { PrismaService } from "src/prisma/prisma.service";


@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTaskDto: CreateTaskDto, userId: number) {
    const {
      parent_task_id,
      priority_id,
      ...taskData
    } = createTaskDto;

    if(parent_task_id) {
      const parentTaskId = await this.prisma.tasks.findUnique({
        where: {task_id: parent_task_id}
      });
      if(!parentTaskId) {
        throw new NotFoundException(`Parent task with ID ${parent_task_id} not found!`)
      }
    }
    if(priority_id) {
      const priorityId = await this.prisma.priorities.findUnique({
        where: { priority_id }
      });
      if(!priorityId) {
        throw new NotFoundException(`Priority task with ID ${priorityId} not found!`)
      }
    }

    const task = await this.prisma.tasks.create({
      data: {
        ...taskData,
        created_by: userId,
        parent_task_id,
        priority_id,
        deadline: taskData.deadline ? new Date(taskData.deadline) : null,
      },
      include: this.basicInclude(),
    });
    return task;
  }

  findAll() {
    return `This action returns all tasks`;
  }

  findOne(id: number) {
    return `This action returns a #${id} task`;
  }

  update(id: number, updateTaskDto: UpdateTaskDto) {
    return `This action updates a #${id} task`;
  }

  remove(id: number) {
    return `This action removes a #${id} task`;
  }
}
