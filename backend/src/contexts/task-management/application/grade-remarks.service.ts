import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  PermissionsService,
  STAFF_ROLES,
} from "../../identity-access/application";
import { GradeRemarkRepository } from "./ports/grade-remark.repository";
import { TaskRepository } from "./ports/task.repository";
import { TaskMembersService } from "./task-members.service";

/**
 * Teachers' grading remarks on a task (decision Q16: `task_grade`). The grade
 * and the per-submission feedback stay on `documents`.
 */
@Injectable()
export class GradeRemarksService {
  constructor(
    private readonly remarks: GradeRemarkRepository,
    private readonly tasks: TaskRepository,
    private readonly members: TaskMembersService,
    private readonly permissions: PermissionsService,
  ) {}

  /** Staff write remarks: the same teacher check as grading a document. */
  async create(taskId: number, userId: number, text: string) {
    await this.existingTask(taskId);
    if (!(await this.permissions.hasAnyRole(userId, STAFF_ROLES))) {
      throw new ForbiddenException("Only teachers write grading remarks");
    }
    return this.remarks.create(taskId, userId, text);
  }

  /** Task members and staff read them. */
  async findForTask(taskId: number, userId: number) {
    await this.existingTask(taskId);
    const mayRead =
      (await this.members.isMember(taskId, userId)) ||
      (await this.permissions.hasAnyRole(userId, STAFF_ROLES));
    if (!mayRead) {
      throw new ForbiddenException("Only task members read grading remarks");
    }
    return this.remarks.findForTask(taskId);
  }

  private async existingTask(taskId: number) {
    if (!(await this.tasks.findById(taskId))) {
      throw new NotFoundException(`Task with ID ${taskId} not found!`);
    }
  }
}
