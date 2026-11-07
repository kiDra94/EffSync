import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaUnitOfWork } from "../../../../shared/infrastructure/prisma/prisma-unit-of-work";
import { TaskRepository } from "../../application/ports/task.repository";
import type {
  NewTask,
  TaskChanges,
  TaskListFilter,
  TaskPageRequest,
} from "../../application/ports/task-records";

const USER_SUMMARY = {
  select: { user_id: true, email: true, firstname: true, lastname: true },
} as const;

/** The relations a task is read with (TasksService.basicInclude before M15). */
const TASK_RELATIONS = {
  users_tasks_created_byTousers: USER_SUMMARY,
  users_tasks_assigned_toTousers: USER_SUMMARY,
  priorities: true,
  tasks: true, // parent task
  task_members: { select: { user_id: true } },
} as const;

const relationsIf = (includeRelations: boolean) =>
  includeRelations ? TASK_RELATIONS : undefined;

/**
 * TaskRepository on Prisma: the queries TasksService made before M15
 * (decision G1). All of them go through the unit of work, so a use case's
 * writes commit together.
 */
@Injectable()
export class PrismaTaskRepository extends TaskRepository {
  constructor(private readonly unitOfWork: PrismaUnitOfWork) {
    super();
  }

  private get db() {
    return this.unitOfWork.client();
  }

  findById(taskId: number) {
    return this.db.tasks.findUnique({ where: { task_id: taskId } });
  }

  findRow(taskId: number, includeRelations: boolean) {
    return this.db.tasks.findUnique({
      where: { task_id: taskId },
      include: relationsIf(includeRelations),
    });
  }

  findParentLink(taskId: number) {
    return this.db.tasks.findUnique({
      where: { task_id: taskId },
      select: { task_id: true, parent_task_id: true },
    });
  }

  findCompletionSnapshot(taskId: number) {
    return this.db.tasks.findUnique({
      where: { task_id: taskId },
      select: {
        task_id: true,
        status: true,
        created_by: true,
        assigned_to: true,
      },
    });
  }

  async priorityExists(priorityId: number) {
    return !!(await this.db.priorities.findUnique({
      where: { priority_id: priorityId },
    }));
  }

  async findPage(
    filter: TaskListFilter,
    visibleTo: number | undefined,
    page: TaskPageRequest,
  ) {
    const where: Prisma.tasksWhereInput = {};
    if (filter.status) where.status = filter.status;
    if (filter.priority_id) where.priority_id = filter.priority_id;
    if (filter.assigned_to) where.assigned_to = filter.assigned_to;
    if (filter.created_by) where.created_by = filter.created_by;
    if (filter.parent_task_id !== undefined) {
      where.parent_task_id =
        filter.parent_task_id === 0 ? null : filter.parent_task_id;
    }

    const searchFilter: Prisma.tasksWhereInput | undefined = filter.search
      ? {
          OR: [
            { title: { contains: filter.search, mode: "insensitive" } },
            { description: { contains: filter.search, mode: "insensitive" } },
          ],
        }
      : undefined;
    // Teacher, Admin and Superuser see all tasks (for grading); everyone else
    // only the tasks they created, are assigned to or are a member of
    const visibilityFilter: Prisma.tasksWhereInput | undefined =
      visibleTo === undefined
        ? undefined
        : {
            OR: [
              { created_by: visibleTo },
              { assigned_to: visibleTo },
              { task_members: { some: { user_id: visibleTo } } },
            ],
          };
    // search and visibility are combined with AND (problem 1)
    const filters = [searchFilter, visibilityFilter].filter(
      (f): f is Prisma.tasksWhereInput => Boolean(f),
    );
    if (filters.length > 0) where.AND = filters;

    const [tasks, total] = await Promise.all([
      this.db.tasks.findMany({
        where,
        include: relationsIf(page.includeRelations),
        orderBy: { [page.sortBy]: page.sortOrder },
        skip: page.skip,
        take: page.take,
      }),
      this.db.tasks.count({ where }),
    ]);
    return { tasks, total };
  }

  findChildrenOf(
    parentIds: number[],
    includeRelations: boolean,
    sortBy: string,
    sortOrder: "asc" | "desc",
  ) {
    return this.db.tasks.findMany({
      where: { parent_task_id: { in: parentIds } },
      include: relationsIf(includeRelations),
      orderBy: { [sortBy]: sortOrder },
    });
  }

  findSubtasks(parentId: number, includeRelations: boolean) {
    return this.db.tasks.findMany({
      where: { parent_task_id: parentId },
      include: relationsIf(includeRelations),
      orderBy: { created_at: "asc" },
    });
  }

  async findChildIds(parentId: number) {
    const children = await this.db.tasks.findMany({
      where: { parent_task_id: parentId },
      select: { task_id: true },
    });
    return children.map((child) => Number(child.task_id));
  }

  countSubtasks(taskId: number) {
    return this.db.tasks.count({ where: { parent_task_id: taskId } });
  }

  findAllByCreator(createdBy: number | null, includeRelations: boolean) {
    return this.db.tasks.findMany({
      where: { created_by: createdBy },
      include: relationsIf(includeRelations),
    });
  }

  findWithCompletionRule() {
    return this.db.tasks.findMany({
      where: { completion_rule: { not: Prisma.JsonNull } },
    });
  }

  async findCompletedChildIds(parentId: number) {
    const done = await this.db.tasks.findMany({
      where: { parent_task_id: parentId, status: "COMPLETED" },
      select: { task_id: true },
    });
    return done.map((t) => t.task_id);
  }

  create(data: NewTask) {
    return this.db.tasks.create({ data, include: TASK_RELATIONS });
  }

  async addMember(taskId: number, userId: number) {
    await this.db.task_members.upsert({
      where: { task_id_user_id: { task_id: taskId, user_id: userId } },
      update: {},
      create: { task_id: taskId, user_id: userId },
    });
  }

  update(taskId: number, data: TaskChanges) {
    return this.db.tasks.update({
      where: { task_id: taskId },
      data,
      include: TASK_RELATIONS,
    });
  }

  updateRow(taskId: number, data: TaskChanges) {
    return this.db.tasks.update({ where: { task_id: taskId }, data });
  }

  async completeAll(taskIds: number[]) {
    await this.db.tasks.updateMany({
      where: { task_id: { in: taskIds }, status: { not: "COMPLETED" } },
      data: { status: "COMPLETED", progress: 100, updated_at: new Date() },
    });
  }

  async delete(taskId: number) {
    const tx = this.db;
    const ofTask = { where: { task_id: taskId } };
    // FK NoAction on several relations -> clean up dependent data first;
    // comments and grading remarks go with the task (decision Q16)
    await tx.comments.deleteMany(ofTask);
    await tx.task_grade.deleteMany(ofTask);
    await tx.task_documents.deleteMany(ofTask);
    // chat rooms stay, without the task
    await tx.chat_rooms.updateMany({ ...ofTask, data: { task_id: null } });
    await tx.tasks.delete({ where: { task_id: taskId } });
  }

  async findMemberIds(taskId: number) {
    const members = await this.db.task_members.findMany({
      where: { task_id: taskId },
      select: { user_id: true },
    });
    return members.map((member) => member.user_id);
  }

  findParticipantProfiles(userIds: number[]) {
    return this.db.users.findMany({
      where: { user_id: { in: userIds } },
      select: {
        user_id: true,
        students: { select: { student_id: true } },
        user_roles: { select: { roles: { select: { name: true } } } },
      },
    });
  }

  async findGradedSubmissionAuthors(studentIds: number[], taskId: number) {
    const graded = await this.db.documents.findMany({
      where: {
        added_by: { in: studentIds },
        graded_at: { not: null },
        task_documents: { some: { task_id: taskId } },
      },
      select: { added_by: true },
    });
    return graded.map((document) => document.added_by);
  }

  findSubmissionsOf(taskId: number, userId: number) {
    return this.db.documents.findMany({
      where: {
        task_documents: { some: { task_id: taskId } },
        added_by: userId, // from THIS student
      },
      select: {
        document_id: true,
        graded_at: true,
        grade: true,
        feedback: true,
      },
    });
  }

  async findDocuments(taskId: number) {
    const taskDocuments = await this.db.task_documents.findMany({
      where: { task_id: taskId },
      include: { documents: true },
    });
    return taskDocuments.map((td) => td.documents);
  }
}
