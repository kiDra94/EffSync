import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { QueryTasksDto } from "./dto/query-tasks.dto";


@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createTaskDto: CreateTaskDto, userId: number) {
    const {
      parent_task_id,
      priority_id,
      ...taskData
    } = createTaskDto;

    if (parent_task_id) {
      const parentTaskId = await this.prisma.tasks.findUnique({
        where: { task_id: parent_task_id }
      });
      if (!parentTaskId) {
        throw new NotFoundException(`Parent task with ID ${parent_task_id} not found!`)
      }
    }
    if (priority_id) {
      const priorityId = await this.prisma.priorities.findUnique({
        where: { priority_id }
      });
      if (!priorityId) {
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

  async findOne(taskId: number, includeRelations = true) {
    const task = await this.prisma.tasks.findUnique({
      where: { task_id: taskId },
      include: includeRelations ? this.basicInclude() : undefined,
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found!`)
    }
    return task;
  }

  async findeOneWithSubtasks(taskId: number, includeRelations = true) {
    const rootTask = await this.prisma.tasks.findUnique({
      where: { task_id: taskId }
    });
    if (!rootTask) {
      throw new NotFoundException(`Task with ID ${taskId} not found!`)
    };

    const allTasks = await this.prisma.tasks.findMany({
      where: { created_by: rootTask.created_by },
      include: includeRelations ? this.basicInclude() : undefined,
    });

    return this.buildTree(allTasks, taskId);
  }

  async update(taskId: number, updateTaskDto: UpdateTaskDto) {
    const {
      parent_task_id,
      priority_id,
      ...taskData
    } = updateTaskDto;

    if (parent_task_id !== undefined) {
      if (parent_task_id === taskId) {
        throw new BadRequestException('Task cannot be its own parent');
      }

      if (parent_task_id) {
        const parentTask = await this.prisma.tasks.findUnique({
          where: { task_id: parent_task_id },
        });
        if (!parentTask) {
          throw new NotFoundException(
            `Parent task with ID ${parent_task_id} not found`,
          );
        }
        await this.validateNoCircularReference(taskId, parent_task_id);
      }
    }

    if (priority_id !== undefined && priority_id !== null) {
      const priority = await this.prisma.priorities.findUnique({
        where: { priority_id },
      });
      if (!priority) {
        throw new NotFoundException(
          `Priority with ID ${priority_id} not found`,
        );
      }
    }

    return this.prisma.tasks.update({
      where: { task_id: taskId },
      data: {
        ...taskData,
        parent_task_id,
        priority_id,
        deadline: taskData.deadline ? new Date(taskData.deadline) : undefined,
        updated_at: new Date(),
      },
      include: this.basicInclude(),
    });
  }

  async remove(taskId: number) {
    const task = await this.findOne(taskId, false);

    const subtasksCount = await this.prisma.tasks.count({
      where: { parent_task_id: taskId },
    });

    if (subtasksCount > 0) {
      throw new BadRequestException(
        `Cannot delete task with ${subtasksCount} subtask(s). Delete subtasks first or reassign them.`,
      );
    }

    await this.prisma.tasks.delete({
      where: { task_id: taskId },
    });

    return { 
      message: 'Task deleted successfully', 
      task_id: taskId 
    };
  }

  async createSubTask(parentTaskID: number, createTaskDto: CreateTaskDto, userId: number) {
    await this.findOne(parentTaskID, false);
    return this.create({...createTaskDto, parent_task_id: parentTaskID}, userId)
  }

  async getSubtasksOfTask(parentID: number, includeRelations = true) {
    await this.findOne(parentID, false);
    return this.prisma.tasks.findMany({
      where: { parent_task_id: parentID },
      include: includeRelations ? this.basicInclude() : undefined,
      orderBy: { created_at: 'asc' }
    })
  }

  async changeTaskParent(taskId: number, newParentId: number | null) {
    const task = await this.findOne(taskId, false);

    if (newParentId) {
      await this.findOne(newParentId, false);
      await this.validateNoCircularReference(taskId, newParentId);
      if (taskId === newParentId) {
        throw new BadRequestException('Task cannot be its own parent');
      }
    }

    return this.prisma.tasks.update({
      where: { task_id: taskId },
      data: {
        parent_task_id: newParentId,
        updated_at: new Date(),
      },
      include: this.basicInclude(),
    });
  }

  async getDocuments(taskId: number) {
    await this.findOne(taskId, false);
    const taskDocuments = await this.prisma.task_documents.findMany({
      where: { task_id: taskId },
      include: {
        documents: true,
      },
    });
    return taskDocuments.map(td => td.documents);
  }

  async getComments(taskId: number, includeRelations = true) {
    await this.findOne(taskId, false);
  
    return this.prisma.task_comments.findMany({
      where: { task_id: taskId },
      include: includeRelations ? this.userSelectInclude() : undefined,
      orderBy: { created_at: 'asc' },
    });
  }

  async getActivityLog(taskId: number, includeRelations = true) {
    await this.findOne(taskId, false);
  
    return this.prisma.task_activity_log.findMany({
      where: { task_id: taskId },
      include: includeRelations ? this.userSelectInclude() : undefined,
      orderBy: { timestamp: 'desc' },
    });
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

  private userSelectInclude() {
    return {
      users: {
        select: {
          user_id: true,
          email: true,
          first_name: true,
          last_name: true,
        },
      },
    };
  }

  private buildTree(allTasks: any[], taskId: number) {
    const taskMap = new Map();

    allTasks.forEach(task => {
      taskMap.set(task.task_id, { ...task, subtasks: [] });
    })
    taskMap.forEach(task => {
      const currentTaskId = taskMap.get(task.task_id);
      const parentTaskId = taskMap.get(task.parent_task_id);
      parentTaskId?.subtasks.push(currentTaskId);
    })

    return taskMap.get(taskId);
  }

  private async validateNoCircularReference(taskId: number, parentTaskId: number,): Promise<void> {
    let currentTask = await this.prisma.tasks.findUnique({
      where: { task_id: parentTaskId },
      select: { task_id: true, parent_task_id: true },
    });

    const visited = new Set<number>([taskId]);

    while (currentTask) {
      if (visited.has(currentTask.task_id)) {
        throw new BadRequestException(
          'Circular reference detected: Task cannot be ancestor of itself',
        );
      }
      visited.add(currentTask.task_id);
      if (!currentTask.parent_task_id) break;
      currentTask = await this.prisma.tasks.findUnique({
        where: { task_id: currentTask.parent_task_id },
        select: { task_id: true, parent_task_id: true },
      });
    }
  }
}
