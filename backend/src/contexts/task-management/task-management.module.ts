import { Global, Module } from "@nestjs/common";
import { PrismaModule } from "../../shared/infrastructure/prisma/prisma.module";
import { TaskActivityLogService } from "./application/activity-log.service";
import { CommentsService } from "./application/comments.service";
import { GradeRemarksService } from "./application/grade-remarks.service";
import { ActivityLogRepository } from "./application/ports/activity-log.repository";
import { CommentRepository } from "./application/ports/comment.repository";
import { GradeRemarkRepository } from "./application/ports/grade-remark.repository";
import { TaskMemberRepository } from "./application/ports/task-member.repository";
import { TaskTemplateRepository } from "./application/ports/task-template.repository";
import { TaskRepository } from "./application/ports/task.repository";
import { TaskRealtime } from "./application/ports/task-realtime";
import { TaskCompletionService } from "./application/task-completion.service";
import { TaskLockingService } from "./application/task-locking.service";
import { TaskMembersService } from "./application/task-members.service";
import { TaskTemplatesService } from "./application/task-templates.service";
import { TaskService } from "./application/task.service";
import { TaskNotificationsService } from "./application/task-notifications.service";
import { TaskVisibilityService } from "./application/task-visibility.service";
import { TaskResubmissionService } from "./application/task-resubmission.service";
import { PrismaActivityLogRepository } from "./infrastructure/persistence/prisma-activity-log.repository";
import { PrismaCommentRepository } from "./infrastructure/persistence/prisma-comment.repository";
import { PrismaGradeRemarkRepository } from "./infrastructure/persistence/prisma-grade-remark.repository";
import { PrismaTaskMemberRepository } from "./infrastructure/persistence/prisma-task-member.repository";
import { PrismaTaskTemplateRepository } from "./infrastructure/persistence/prisma-task-template.repository";
import { PrismaTaskRepository } from "./infrastructure/persistence/prisma-task.repository";
import { RealtimeTaskEvents } from "./infrastructure/realtime-task-events";
import { TaskAccountDeletion } from "./infrastructure/task-account-deletion";
import { TaskController } from "./presentation/task.controller";

/**
 * task-management (GOALS.md M15, L1 core): tasks, subtasks, completion rules,
 * locking, members, templates, comments, grading remarks and the activity
 * log. Task events go out through the shared realtime transport (M20);
 * MentionMailer comes from the legacy e-mail module's global binding,
 * PermissionsService and the account deletion registry from identity-access
 * (global).
 */
// global for TaskCompletionService and TaskResubmissionService: grading in
// documents-notes completes and reopens tasks through them (M17, M19)
@Global()
@Module({
  imports: [PrismaModule],
  controllers: [TaskController],
  providers: [
    TaskService,
    TaskLockingService,
    TaskCompletionService,
    TaskActivityLogService,
    TaskMembersService,
    TaskTemplatesService,
    CommentsService,
    GradeRemarksService,
    TaskNotificationsService,
    TaskVisibilityService,
    TaskResubmissionService,
    TaskAccountDeletion,
    { provide: TaskRepository, useClass: PrismaTaskRepository },
    { provide: TaskRealtime, useClass: RealtimeTaskEvents },
    { provide: ActivityLogRepository, useClass: PrismaActivityLogRepository },
    { provide: TaskMemberRepository, useClass: PrismaTaskMemberRepository },
    { provide: TaskTemplateRepository, useClass: PrismaTaskTemplateRepository },
    { provide: CommentRepository, useClass: PrismaCommentRepository },
    { provide: GradeRemarkRepository, useClass: PrismaGradeRemarkRepository },
  ],
  exports: [TaskCompletionService, TaskResubmissionService],
})
export class TaskManagementModule {}
