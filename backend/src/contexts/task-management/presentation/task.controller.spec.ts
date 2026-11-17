import { Test, TestingModule } from "@nestjs/testing";
import { PATH_METADATA } from "@nestjs/common/constants";
import {
  JwtAuthGuard,
  PermissionsGuard,
  RolesGuard,
} from "../../../shared/presentation/security";
import { TaskActivityLogService } from "../application/activity-log.service";
import { CommentsService } from "../application/comments.service";
import { GradeRemarksService } from "../application/grade-remarks.service";
import { TaskLockingService } from "../application/task-locking.service";
import { TaskMembersService } from "../application/task-members.service";
import { TaskTemplatesService } from "../application/task-templates.service";
import { TaskService } from "../application/task.service";
import { TaskController } from "./task.controller";
import { TaskVisibilityGuard } from "./task-visibility.guard";

// decision Q6 (M15): one controller for every task route
describe("TaskController", () => {
  let controller: TaskController;
  const tasks = { create: jest.fn(), findAll: jest.fn() };
  const comments = { create: jest.fn() };
  const gradeRemarks = { create: jest.fn() };
  const activity = { findAll: jest.fn() };
  const req = { user: { userId: 5 } } as never;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskController],
      providers: [
        { provide: TaskService, useValue: tasks },
        { provide: TaskLockingService, useValue: {} },
        { provide: TaskActivityLogService, useValue: activity },
        { provide: TaskTemplatesService, useValue: {} },
        { provide: TaskMembersService, useValue: {} },
        { provide: CommentsService, useValue: comments },
        { provide: GradeRemarksService, useValue: gradeRemarks },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TaskVisibilityGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TaskController>(TaskController);
    jest.clearAllMocks();
  });

  it("declares /tasks/activity and /tasks/templates before /tasks/:id", () => {
    const paths = Object.getOwnPropertyNames(TaskController.prototype)
      .filter((name) => name !== "constructor")
      .map(
        (name) =>
          Reflect.getMetadata(
            PATH_METADATA,
            (TaskController.prototype as unknown as Record<string, object>)[
              name
            ],
          ) as string | undefined,
      );
    const firstById = paths.indexOf(":id");
    expect(paths.indexOf("activity")).toBeLessThan(firstById);
    expect(paths.indexOf("templates")).toBeLessThan(firstById);
    expect(paths.indexOf("templates/:templateId")).toBeLessThan(firstById);
  });

  it("passes the requester to the use cases", async () => {
    await controller.create({ title: "A" } as never, req);
    await controller.createComment(3, { content: "Hallo" }, req);
    await controller.createGradeRemark(3, { text: "Gut" }, req);

    expect(tasks.create).toHaveBeenCalledWith({ title: "A" }, 5);
    expect(comments.create).toHaveBeenCalledWith(3, 5, "Hallo");
    expect(gradeRemarks.create).toHaveBeenCalledWith(3, 5, "Gut");
  });

  it("maps the audit-log query", async () => {
    const from = new Date("2026-11-01");
    await controller.findAllActivity({ user_id: 2, from, page: 2 });

    expect(activity.findAll).toHaveBeenCalledWith({
      userId: 2,
      action: undefined,
      from,
      to: undefined,
      page: 2,
      limit: undefined,
    });
  });
});
