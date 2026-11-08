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
import { TaskCompletionService } from "./application/task-completion.service";
import { TaskLockingService } from "./application/task-locking.service";
import { TaskMembersService } from "./application/task-members.service";
import { TaskTemplatesService } from "./application/task-templates.service";
import { TaskService } from "./application/task.service";
import { TaskNotificationsService } from "./application/task-notifications.service";
import { TaskVisibilityService } from "./application/task-visibility.service";
import { PrismaActivityLogRepository } from "./infrastructure/persistence/prisma-activity-log.repository";
import { PrismaCommentRepository } from "./infrastructure/persistence/prisma-comment.repository";
import { PrismaGradeRemarkRepository } from "./infrastructure/persistence/prisma-grade-remark.repository";
import { PrismaTaskMemberRepository } from "./infrastructure/persistence/prisma-task-member.repository";
import { PrismaTaskTemplateRepository } from "./infrastructure/persistence/prisma-task-template.repository";
import { PrismaTaskRepository } from "./infrastructure/persistence/prisma-task.repository";
import { TaskAccountDeletion } from "./infrastructure/task-account-deletion";
import { TaskController } from "./presentation/task.controller";

/**
 * task-management (GOALS.md M15, L1 core): tasks, subtasks, completion rules,
 * locking, members, templates, comments, grading remarks and the activity
 * log. TaskRealtime and MentionMailer come from the legacy WebSocket and
 * e-mail modules' global bindings; PermissionsService and the account
 * deletion registry from identity-access (global).
 */
// global for TaskCompletionService: grading in the legacy documents module
// completes tasks through it (M17), and a legacy module may not import a
// context's module file (dependency rule context-via-application)
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
    TaskAccountDeletion,
    { provide: TaskRepository, useClass: PrismaTaskRepository },
    { provide: ActivityLogRepository, useClass: PrismaActivityLogRepository },
    { provide: TaskMemberRepository, useClass: PrismaTaskMemberRepository },
    { provide: TaskTemplateRepository, useClass: PrismaTaskTemplateRepository },
    { provide: CommentRepository, useClass: PrismaCommentRepository },
    { provide: GradeRemarkRepository, useClass: PrismaGradeRemarkRepository },
  ],
  exports: [TaskCompletionService],
})
export class TaskManagementModule {}
