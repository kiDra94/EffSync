import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { QueryTasksDto } from "./dto/query-tasks.dto";


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

  async findAll(queryDto: QueryTasksDto) {
    const {
      status,
      priority_id,
      assigned_to,
      created_by,
      parent_task_id,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc',
      page = 1,
      limit = 50,
      includeRelations = false,
    } = queryDto;

    const where: any = {}; // muss so heissen da prisma where erwartet!

    if (status) where.status = status;
    if (priority_id) where.priority_id = priority_id;
    if (assigned_to) where.assigned_to = assigned_to;
    if (created_by) where.created_by = created_by;
    
    if (parent_task_id !== undefined) {
      where.parent_task_id = parent_task_id === 0 ? null : parent_task_id;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      this.prisma.tasks.findMany({
        where,
        include: includeRelations ? this.basicInclude() : undefined,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.tasks.count({ where }),
    ]);

    return {
      data: tasks,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(userId: number, includeRelations = true) {
    const task = await this.prisma.tasks.findUnique({
      where: { task_id: userId},
      include: includeRelations ? this.basicInclude() : undefined,
    });

    if(!task) {
      throw new NotFoundException (`Task with ID ${userId} not found!`)
    }
    return task;
  }

  update(userId: number, updateTaskDto: UpdateTaskDto) {
    return `This action updates a #${userId} task`;
  }

  remove(userId: number) {
    return `This action removes a #${userId} task`;
  }

  private basicInclude() {
    return {
      users_tasks_created_byTousers: {
        select: {
          user_id: true,
          email: true,
          first_name: true,
          last_name: true,
        },
      },
      users_tasks_assigned_toTousers: {
        select: {
          user_id: true,
          email: true,
          first_name: true,
          last_name: true,
        },
      },
      priorities: true,
      tasks: true, // parent task
    };
  }
}
