import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { PermissionsService } from "../../identity-access/application";
import { GradeRemarksService } from "./grade-remarks.service";
import { GradeRemarkRepository } from "./ports/grade-remark.repository";
import { TaskRepository } from "./ports/task.repository";
import { TaskMembersService } from "./task-members.service";

// decision Q16 (M15): teachers write grading remarks, task members read them
describe("GradeRemarksService", () => {
  let remarks: { create: jest.Mock; findForTask: jest.Mock };
  let tasks: { findById: jest.Mock };
  let members: { isMember: jest.Mock };
  let permissions: { hasAnyRole: jest.Mock };
  let service: GradeRemarksService;

  beforeEach(() => {
    remarks = {
      create: jest.fn().mockResolvedValue({ comment_id: 1 }),
      findForTask: jest.fn().mockResolvedValue([]),
    };
    tasks = { findById: jest.fn().mockResolvedValue({ task_id: 3 }) };
    members = { isMember: jest.fn().mockResolvedValue(false) };
    permissions = { hasAnyRole: jest.fn().mockResolvedValue(false) };
    service = new GradeRemarksService(
      remarks as unknown as GradeRemarkRepository,
      tasks as unknown as TaskRepository,
      members as unknown as TaskMembersService,
      permissions as unknown as PermissionsService,
    );
  });

  it("lets a teacher write a remark", async () => {
    permissions.hasAnyRole.mockResolvedValue(true);

    await service.create(3, 2, "Gute Arbeit");

    expect(remarks.create).toHaveBeenCalledWith(3, 2, "Gute Arbeit");
  });

  it("answers 403 to a non-teacher and 404 for an unknown task", async () => {
    await expect(service.create(3, 4, "x")).rejects.toThrow(ForbiddenException);
    tasks.findById.mockResolvedValue(null);
    await expect(service.create(9, 2, "x")).rejects.toThrow(NotFoundException);
    expect(remarks.create).not.toHaveBeenCalled();
  });

  it("lets task members and staff read the remarks, nobody else", async () => {
    members.isMember.mockResolvedValueOnce(true);
    await service.findForTask(3, 4);

    permissions.hasAnyRole.mockResolvedValueOnce(true);
    await service.findForTask(3, 2);

    await expect(service.findForTask(3, 8)).rejects.toThrow(ForbiddenException);
    expect(remarks.findForTask).toHaveBeenCalledTimes(2);
  });
});
