import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { AuthenticatedRequest } from "../../../shared/presentation/security";
import { TaskVisibilityService } from "../application/task-visibility.service";

/**
 * Applies the visible set (decision B3, M17) to every /tasks/:id… route in
 * one place, reads and writes alike, so a new route can't forget it. A task
 * the requester can't see answers 404, like a missing one. Runs after the
 * JWT, role and permission guards.
 */
@Injectable()
export class TaskVisibilityGuard implements CanActivate {
  constructor(private readonly visibility: TaskVisibilityService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest & { params: { id?: string } }>();
    const taskId = Number(request.params?.id);
    // no :id (lists, templates) or not a number (ParseIntPipe answers 400)
    if (!request.params?.id || !Number.isInteger(taskId)) return true;

    if (!(await this.visibility.isVisible(taskId, request.user.userId))) {
      throw new NotFoundException(`Task with ID ${taskId} not found!`);
    }
    return true;
  }
}
