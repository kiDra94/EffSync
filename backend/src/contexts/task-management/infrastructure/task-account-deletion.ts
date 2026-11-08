import { Injectable, OnModuleInit } from "@nestjs/common";
import {
  AccountDeletionRegistry,
  GHOST_USER_ID,
  type AccountDeletionParticipant,
} from "../../identity-access/application";
import { PrismaUnitOfWork } from "../../../shared/infrastructure/prisma/prisma-unit-of-work";

/**
 * task-management's part of an account deletion (T10, decision H1, M15
 * step 6): the task work stays under the ghost user, assignments end. Runs
 * in identity-access's deletion unit of work; `task_members` cascade.
 */
@Injectable()
export class TaskAccountDeletion
  implements AccountDeletionParticipant, OnModuleInit
{
  constructor(
    private readonly unitOfWork: PrismaUnitOfWork,
    private readonly registry: AccountDeletionRegistry,
  ) {}

  onModuleInit() {
    this.registry.register(this);
  }

  async anonymizeUser(userId: number): Promise<void> {
    const tx = this.unitOfWork.client();
    const createdBy = { created_by: GHOST_USER_ID };
    await tx.tasks.updateMany({
      where: { created_by: userId },
      data: createdBy,
    });
    await tx.comments.updateMany({
      where: { created_by: userId },
      data: createdBy,
    });
    // templates are private (decision E1), so they are personal rows: the
    // tasks created from them keep everything but the link
    await tx.tasks.updateMany({
      where: { task_templates: { created_by: userId } },
      data: { template_id: null },
    });
    await tx.task_templates.deleteMany({ where: { created_by: userId } });
    const toGhost = { user_id: GHOST_USER_ID };
    await tx.task_grade.updateMany({
      where: { user_id: userId },
      data: toGhost,
    });
    await tx.task_activity_log.updateMany({
      where: { user_id: userId },
      data: toGhost,
    });
    await tx.tasks.updateMany({
      where: { assigned_to: userId },
      data: { assigned_to: null },
    });
  }
}
