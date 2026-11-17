import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { TaskScope } from "../../../../shared/application/task-scope";
import { PrismaUnitOfWork } from "../../../../shared/infrastructure/prisma/prisma-unit-of-work";
import {
  taskScopeSql,
  withRecursive,
} from "../../../../shared/infrastructure/prisma/task-scope.sql";
import { TaskRepository } from "../../application/ports/task.repository";
import { TASK_SORT_KEYS } from "../../application/ports/task-records";
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
  // T59 (M18): the task's tags
  task_tags: { select: { tags: { select: { tag_id: true, name: true } } } },
} as const;

const relationsIf = (includeRelations: boolean) =>
  includeRelations ? TASK_RELATIONS : undefined;

/** `%`, `_` and `\` are characters in a search, not LIKE wildcards (M37). */
const likePattern = (search: string) =>
  `%${search.replace(/[\\%_]/g, "\\$&")}%`;

/** The GET /tasks filters as SQL on the tasks aliased `t`. */
function listConditions(filter: TaskListFilter): Prisma.Sql[] {
  const conditions: Prisma.Sql[] = [];
  if (filter.status) {
    conditions.push(Prisma.sql`t.status::text = ${filter.status}`);
  }
  if (filter.priority_id) {
    conditions.push(Prisma.sql`t.priority_id = ${filter.priority_id}`);
  }
  if (filter.assigned_to) {
    conditions.push(Prisma.sql`t.assigned_to = ${filter.assigned_to}`);
  }
  // 0 is the ghost user, the creator of deleted accounts' tasks (M33)
  if (filter.created_by !== undefined) {
    conditions.push(Prisma.sql`t.created_by = ${filter.created_by}`);
  }
  if (filter.parent_task_id !== undefined) {
    conditions.push(
      filter.parent_task_id === 0
        ? Prisma.sql`t.parent_task_id IS NULL`
        : Prisma.sql`t.parent_task_id = ${filter.parent_task_id}`,
    );
  }
  if (filter.search) {
    const pattern = likePattern(filter.search);
    // search and visibility are combined with AND (problem 1)
    conditions.push(
      Prisma.sql`(t.title ILIKE ${pattern} OR t.description ILIKE ${pattern})`,
    );
  }
  return conditions;
}

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

  findCompletionSnapshots(taskIds: number[]) {
    return this.db.tasks.findMany({
      where: { task_id: { in: taskIds } },
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
    scope: TaskScope,
    page: TaskPageRequest,
  ) {
    // M37: the visible set, the filters, the order and the count stay in
    // the database; only the page's ids come back
    const { cte, where: inScope } = taskScopeSql(scope);
    const prefix = withRecursive(cte);
    const where = Prisma.join([inScope, ...listConditions(filter)], " AND ");
    if (!TASK_SORT_KEYS.includes(page.sortBy)) {
      throw new Error(`Unknown sort key: ${String(page.sortBy)}`);
    }
    const direction = page.sortOrder === "asc" ? "ASC" : "DESC";
    // the page and the count apart and in parallel: a window count over
    // all 20,000 tasks of a teacher took twice as long (review M37);
    // task_id breaks ties, so equal sort values keep their page
    const [rows, total] = await Promise.all([
      this.db.$queryRaw<{ task_id: number }[]>(
        Prisma.sql`${prefix}
          SELECT t.task_id FROM tasks t
          WHERE ${where}
          ORDER BY ${Prisma.raw(`t."${page.sortBy}" ${direction}`)}, t.task_id ASC
          LIMIT ${page.take} OFFSET ${page.skip}`,
      ),
      this.countWhere(prefix, where),
    ]);
    if (rows.length === 0) return { tasks: [], total };

    const ids = rows.map((row) => Number(row.task_id));
    const found = await this.db.tasks.findMany({
      where: { task_id: { in: ids } },
      include: relationsIf(page.includeRelations),
    });
    const byId = new Map(found.map((task) => [task.task_id, task]));
    return { tasks: ids.flatMap((id) => byId.get(id) ?? []), total };
  }

  private async countWhere(prefix: Prisma.Sql, where: Prisma.Sql) {
    const [row] = await this.db.$queryRaw<{ total: bigint }[]>(
      Prisma.sql`${prefix} SELECT count(*) AS total FROM tasks t WHERE ${where}`,
    );
    return Number(row?.total ?? 0);
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

  findAllByCreator(createdBy: number, includeRelations: boolean) {
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

  async setTags(taskId: number, names: string[]) {
    const tx = this.db;
    await tx.task_tags.deleteMany({ where: { task_id: taskId } });
    if (names.length === 0) return;
    await tx.tags.createMany({
      data: names.map((name) => ({ name })),
      skipDuplicates: true,
    });
    const tags = await tx.tags.findMany({
      where: { name: { in: names } },
      select: { tag_id: true },
    });
    await tx.task_tags.createMany({
      data: tags.map(({ tag_id }) => ({ task_id: taskId, tag_id })),
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

  // the queries of the deadline jobs (EmailCronService before M23)
  findDueBetween(from: Date, to: Date) {
    return this.deadlineTasks({
      deadline: { gte: from, lte: to },
      status: { not: "COMPLETED" },
      assigned_to: { not: null },
      is_locked: false,
    });
  }

  findOverdueUnlocked(now: Date) {
    return this.deadlineTasks({
      deadline: { lt: now },
      status: { not: "COMPLETED" },
      assigned_to: { not: null },
      is_locked: false,
    });
  }

  private async deadlineTasks(where: Prisma.tasksWhereInput) {
    const rows = await this.db.tasks.findMany({
      where,
      select: {
        task_id: true,
        title: true,
        deadline: true,
        users_tasks_assigned_toTousers: {
          select: { user_id: true, email: true },
        },
      },
    });
    return rows.flatMap(
      ({ users_tasks_assigned_toTousers: assignee, ...task }) =>
        assignee ? [{ ...task, assignee }] : [],
    );
  }

  findChatParticipants(taskId: number) {
    return this.db.tasks.findUnique({
      where: { task_id: taskId },
      select: {
        title: true,
        created_by: true,
        assigned_to: true,
        task_members: { select: { user_id: true } },
      },
    });
  }

  async isVisibleTo(taskId: number, userId: number) {
    // the task and its ancestors; it is visible if the user is the creator,
    // the assignee or a member of any of them: the rule of taskScopeSql
    // (shared/infrastructure/prisma/task-scope.sql.ts), upwards from one task
    // instead of the whole set downwards; change both together
    const rows = await this.db.$queryRaw<{ visible: boolean }[]>`
      WITH RECURSIVE chain AS (
        SELECT task_id, parent_task_id FROM tasks WHERE task_id = ${taskId}
        UNION
        SELECT p.task_id, p.parent_task_id FROM tasks p
        JOIN chain c ON p.task_id = c.parent_task_id
      )
      SELECT EXISTS (
        SELECT 1 FROM chain c JOIN tasks t ON t.task_id = c.task_id
        WHERE t.created_by = ${userId}
           OR t.assigned_to = ${userId}
           OR EXISTS (
             SELECT 1 FROM task_members m
             WHERE m.task_id = c.task_id AND m.user_id = ${userId}
           )
      ) AS visible`;
    return rows[0]?.visible === true;
  }

  findMembersOf(taskIds: number[]) {
    return this.db.task_members.findMany({
      where: { task_id: { in: taskIds } },
      select: { task_id: true, user_id: true },
    });
  }

  async findGradedSubmissions(studentIds: number[], taskIds: number[]) {
    const graded = await this.db.documents.findMany({
      where: {
        added_by: { in: studentIds },
        graded_at: { not: null },
        task_documents: { some: { task_id: { in: taskIds } } },
      },
      select: {
        added_by: true,
        task_documents: {
          where: { task_id: { in: taskIds } },
          select: { task_id: true },
        },
      },
    });
    return graded.map((document) => ({
      added_by: document.added_by,
      taskIds: document.task_documents.map((link) => link.task_id),
    }));
  }

  async completeTasks(taskIds: number[]) {
    await this.db.tasks.updateMany({
      where: { task_id: { in: taskIds } },
      data: { status: "COMPLETED", progress: 100, updated_at: new Date() },
    });
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
