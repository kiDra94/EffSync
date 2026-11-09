import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import type { PermissionsService } from "../../identity-access/application";
import type { UnitOfWork } from "../../../shared/application/unit-of-work";
import type { TaskActivityLogService } from "./activity-log.service";
import type { ActivityLogRepository } from "./ports/activity-log.repository";
import type { CommentRepository } from "./ports/comment.repository";
import type { TaskRepository } from "./ports/task.repository";
import type { TaskCompletionService } from "./task-completion.service";
import type { TaskNotificationsService } from "./task-notifications.service";
import { TaskService } from "./task.service";
import type { TaskTemplatesService } from "./task-templates.service";
import type { TaskVisibilityService } from "./task-visibility.service";

// GOALS.md M29 (T115, 08_…:39-43: TaskService ≥ 90 %): the paths the other
// TaskService specs don't reach, against mocked ports
describe("TaskService paths", () => {
  const task = (overrides: Record<string, unknown> = {}) => ({
    task_id: 1,
    title: "Projekt",
    status: "TODO",
    progress: 0,
    created_by: 2,
    assigned_to: null,
    parent_task_id: null,
    is_locked: false,
    ...overrides,
  });
  let tasks: Record<string, jest.Mock>;
  let completion: Record<string, jest.Mock>;
  let notifications: { taskAssigned: jest.Mock; statusChanged: jest.Mock };
  let activityLog: { create: jest.Mock };
  let activityEntries: Record<string, jest.Mock>;
  let comments: { findForTask: jest.Mock };
  let permissions: { hasAnyPermission: jest.Mock };
  let service: TaskService;

  beforeEach(() => {
    tasks = {
      findById: jest.fn().mockResolvedValue(task()),
      findRow: jest.fn().mockResolvedValue(task()),
      findParentLink: jest.fn().mockResolvedValue(null),
      findMemberIds: jest.fn().mockResolvedValue([]),
      priorityExists: jest.fn().mockResolvedValue(true),
      create: jest.fn().mockResolvedValue(task({ task_id: 9 })),
      addMember: jest.fn(),
      setTags: jest.fn(),
      update: jest.fn((id: number, data: object) =>
        Promise.resolve(task({ task_id: id, ...data })),
      ),
      findChildIds: jest.fn().mockResolvedValue([]),
      completeAll: jest.fn(),
      countSubtasks: jest.fn().mockResolvedValue(0),
      delete: jest.fn(),
      findSubmissionsOf: jest.fn().mockResolvedValue([]),
      findSubtasks: jest.fn().mockResolvedValue([]),
      findDocuments: jest.fn().mockResolvedValue([]),
      findAllByCreator: jest.fn().mockResolvedValue([]),
    };
    completion = {
      completeIfAllStudentsGraded: jest.fn().mockResolvedValue(new Set()),
      completeParentsOf: jest.fn().mockResolvedValue([]),
      notify: jest.fn(),
    };
    notifications = { taskAssigned: jest.fn(), statusChanged: jest.fn() };
    activityLog = { create: jest.fn() };
    activityEntries = {
      detachFromTask: jest.fn(),
      findForTask: jest.fn().mockResolvedValue([]),
    };
    comments = { findForTask: jest.fn().mockResolvedValue([]) };
    permissions = { hasAnyPermission: jest.fn().mockResolvedValue(false) };
    service = new TaskService(
      tasks as unknown as TaskRepository,
      activityLog as unknown as TaskActivityLogService,
      activityEntries as unknown as ActivityLogRepository,
      comments as unknown as CommentRepository,
      completion as unknown as TaskCompletionService,
      permissions as unknown as PermissionsService,
      { run: (work: () => unknown) => work() } as unknown as UnitOfWork,
      notifications as unknown as TaskNotificationsService,
      {} as TaskVisibilityService,
      { assertOwner: jest.fn() } as unknown as TaskTemplatesService,
    );
  });

  describe("findOne", () => {
    it("re-reads a task the grades completed, and keeps it if it vanished", async () => {
      completion.completeIfAllStudentsGraded.mockResolvedValue(new Set([1]));
      tasks.findRow
        .mockResolvedValueOnce(task())
        .mockResolvedValueOnce(task({ status: "COMPLETED" }));
      await expect(service.findOne(1)).resolves.toMatchObject({
        status: "COMPLETED",
      });

      tasks.findRow.mockResolvedValueOnce(task()).mockResolvedValueOnce(null);
      await expect(service.findOne(1)).resolves.toMatchObject({
        status: "TODO",
      });
    });

    it("answers 404 for a missing task", async () => {
      tasks.findRow.mockResolvedValue(null);
      await expect(service.findOne(5)).rejects.toThrow(NotFoundException);
    });
  });

  it("tells a student whether their submission was graded (feature #27)", async () => {
    tasks.findSubmissionsOf.mockResolvedValue([
      { graded_at: null, grade: null },
      { graded_at: new Date(), grade: "2" },
    ]);

    await expect(service.findOneForStudent(1, 4)).resolves.toMatchObject({
      student_submission_status: {
        has_submitted: true,
        has_graded_submission: true,
        submission_count: 2,
        latest_grade: "2",
      },
      is_student_submission_locked: true,
    });

    tasks.findSubmissionsOf.mockResolvedValue([]);
    await expect(service.findOneForStudent(1, 4)).resolves.toMatchObject({
      student_submission_status: { has_submitted: false, latest_grade: null },
      is_student_submission_locked: false,
    });
  });

  it("builds the tree of a task and answers 404 for a missing one", async () => {
    tasks.findAllByCreator.mockResolvedValue([
      task(),
      task({ task_id: 2, parent_task_id: 1 }),
    ]);
    await expect(service.findeOneWithSubtasks(1)).resolves.toMatchObject({
      task_id: 1,
      subtasks: [expect.objectContaining({ task_id: 2 })],
    });
    tasks.findById.mockResolvedValue(null);
    await expect(service.findeOneWithSubtasks(1)).rejects.toThrow(
      NotFoundException,
    );
  });

  describe("create", () => {
    it("returns the re-read task with its tags, or the created one", async () => {
      tasks.findRow.mockResolvedValueOnce(task({ task_id: 9, task_tags: [] }));
      await expect(
        service.create(
          { title: "Mit Tags", deadline: "2026-12-01", tags: ["Mathe"] },
          2,
        ),
      ).resolves.toMatchObject({ task_tags: [] });
      expect(tasks.setTags).toHaveBeenCalledWith(9, ["mathe"]);

      tasks.findRow.mockResolvedValueOnce(null);
      await expect(
        service.create({ title: "x", deadline: "2026-12-01", tags: ["a"] }, 2),
      ).resolves.toMatchObject({ task_id: 9 });
    });

    it("answers 404 for a missing parent or priority", async () => {
      tasks.findById.mockResolvedValueOnce(null);
      await expect(
        service.create(
          { title: "x", deadline: "2026-12-01", parent_task_id: 5 },
          2,
        ),
      ).rejects.toThrow(NotFoundException);

      tasks.priorityExists.mockResolvedValue(false);
      await expect(
        service.create(
          { title: "x", deadline: "2026-12-01", priority_id: 9 },
          2,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    // T41, decision Q2: a subtask of a subtask belongs to the root's project
    it("checks the project of the root task for a nested subtask", async () => {
      tasks.findById
        .mockResolvedValueOnce(task({ task_id: 3, parent_task_id: 1 }))
        .mockResolvedValueOnce(task({ task_id: 1, created_by: 2 }));
      tasks.findParentLink
        .mockResolvedValueOnce({ task_id: 3, parent_task_id: 1 })
        .mockResolvedValueOnce({ task_id: 1, parent_task_id: null });

      await expect(
        service.create(
          { title: "x", deadline: "2026-12-01", parent_task_id: 3 },
          7,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("allows the subtask when the root task is gone", async () => {
      tasks.findById
        .mockResolvedValueOnce(task({ task_id: 3, parent_task_id: 1 }))
        .mockResolvedValueOnce(null);
      tasks.findParentLink
        .mockResolvedValueOnce({ task_id: 3, parent_task_id: 1 })
        .mockResolvedValueOnce({ task_id: 1, parent_task_id: null });

      await expect(
        service.create(
          { title: "x", deadline: "2026-12-01", parent_task_id: 3 },
          7,
        ),
      ).resolves.toMatchObject({ task_id: 9 });
    });
  });

  describe("update", () => {
    it("answers 404 for a missing task and 400 for its own parent", async () => {
      tasks.findById.mockResolvedValueOnce(null);
      await expect(service.update(1, { title: "x" }, 2)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update(1, { parent_task_id: 1 }, 2)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("moves a task under a project only for its members", async () => {
      tasks.findById
        .mockResolvedValueOnce(task({ task_id: 4 }))
        .mockResolvedValueOnce(task({ task_id: 1 }))
        .mockResolvedValueOnce(task({ task_id: 1, created_by: 3 }));

      await expect(service.update(4, { parent_task_id: 1 }, 7)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("tells a new assignee and announces a status change", async () => {
      await service.update(1, { assigned_to: 5, status: "IN_PROGRESS" }, 2);

      expect(notifications.taskAssigned).toHaveBeenCalledWith(
        expect.objectContaining({ assigned_to: 5 }),
        2,
      );
      expect(notifications.statusChanged).toHaveBeenCalledWith(
        expect.objectContaining({ status: "IN_PROGRESS" }),
        2,
      );
    });

    it("completes the subtasks of a completed task and its parents", async () => {
      tasks.findChildIds
        .mockResolvedValueOnce([2, 3])
        .mockResolvedValueOnce([3])
        .mockResolvedValueOnce([]);
      tasks.update.mockResolvedValueOnce(
        task({ status: "COMPLETED", progress: 100, parent_task_id: 8 }),
      );
      completion.completeParentsOf.mockResolvedValue([
        { updated: task({ task_id: 8 }) },
      ]);

      await service.update(1, { status: "COMPLETED", progress: 100 });

      // a subtask reached twice is listed twice; completing it twice is harmless
      expect(tasks.completeAll).toHaveBeenCalledWith([2, 3, 3]);
      expect(notifications.statusChanged).toHaveBeenCalledWith(
        expect.objectContaining({ task_id: 8 }),
        undefined,
      );
      // no assignee changed, so nobody is told about an assignment
      expect(notifications.taskAssigned).not.toHaveBeenCalled();
    });

    it("moves a task without a requester and logs nothing without a creator", async () => {
      tasks.findById
        .mockResolvedValueOnce(task({ task_id: 4, created_by: null }))
        .mockResolvedValueOnce(task({ task_id: 1 }))
        .mockResolvedValueOnce(task({ task_id: 1 }));
      tasks.update.mockResolvedValueOnce(
        task({ task_id: 4, created_by: null, assigned_to: 6 }),
      );

      await service.update(4, { parent_task_id: 1 });

      expect(activityLog.create).not.toHaveBeenCalled();
      // the new assignee is told, without a requester as user 0
      expect(notifications.taskAssigned).toHaveBeenCalledWith(
        expect.objectContaining({ assigned_to: 6 }),
        0,
      );
    });

    it("refuses a missing priority", async () => {
      tasks.priorityExists.mockResolvedValue(false);
      await expect(service.update(1, { priority_id: 9 }, 2)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("remove", () => {
    it("logs the delete under the creator when nobody asked", async () => {
      await expect(service.remove(1)).resolves.toEqual({
        message: "Task deleted successfully",
        task_id: 1,
      });
      expect(activityLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ task_id: 1 }),
        2,
        false,
      );
    });

    it("logs the delete of a task without a creator under user 0", async () => {
      tasks.findRow.mockResolvedValue(task({ created_by: null }));

      await service.remove(1);

      expect(activityLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ task_id: 1 }),
        0,
        false,
      );
    });

    it("needs delete_tasks for someone else's task and no subtasks", async () => {
      await expect(service.remove(1, 7)).rejects.toThrow(ForbiddenException);

      tasks.countSubtasks.mockResolvedValue(2);
      await expect(service.remove(1, 2)).rejects.toThrow(BadRequestException);
    });
  });

  describe("subtasks and parents", () => {
    it("creates and lists subtasks of an existing task", async () => {
      await service.createSubTask(
        1,
        { title: "Teil", deadline: "2026-12-01" },
        2,
      );
      expect(tasks.create).toHaveBeenCalledWith(
        expect.objectContaining({ parent_task_id: 1 }),
      );
      await service.getSubtasksOfTask(1);
      expect(tasks.findSubtasks).toHaveBeenCalledWith(1, true);
    });

    it("changes the parent, refuses its own parent, and detaches", async () => {
      await expect(service.changeTaskParent(1, 1)).rejects.toThrow(
        BadRequestException,
      );
      await service.changeTaskParent(1, 4);
      expect(tasks.update).toHaveBeenLastCalledWith(
        1,
        expect.objectContaining({ parent_task_id: 4 }),
      );
      await service.changeTaskParent(1, null);
      expect(tasks.update).toHaveBeenLastCalledWith(
        1,
        expect.objectContaining({ parent_task_id: null }),
      );
    });

    it("refuses a parent that would create a cycle", async () => {
      tasks.findParentLink
        .mockResolvedValueOnce({ task_id: 4, parent_task_id: 1 })
        .mockResolvedValueOnce({ task_id: 1, parent_task_id: null });

      await expect(service.changeTaskParent(1, 4)).rejects.toThrow(
        "Circular reference detected",
      );
    });
  });

  it("reads documents, comments and the activity log of an existing task", async () => {
    await service.getDocuments(1);
    await service.getComments(1);
    await service.getActivityLog(1);

    expect(tasks.findDocuments).toHaveBeenCalledWith(1);
    expect(comments.findForTask).toHaveBeenCalledWith(1);
    expect(activityEntries.findForTask).toHaveBeenCalledWith(1, true);
  });
});
