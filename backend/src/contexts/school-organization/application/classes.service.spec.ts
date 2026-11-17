import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import type { PermissionsService } from "../../identity-access/application";
import type { UnitOfWork } from "../../../shared/application/unit-of-work";
import type { ClassRepository } from "./ports/class.repository";
import type { DepartmentRepository } from "./ports/school-catalog.repository";
import type { ScheduleRepository } from "./ports/schedule.repository";
import { ClassesService } from "./classes.service";

// T26, decisions D1 and D2, UC-20 (M36): classes with their members
describe("ClassesService", () => {
  const ADMIN = 1;
  const TEACHER = 2;
  let classes: Record<string, jest.Mock>;
  let permissions: { hasPermission: jest.Mock };
  let departments: { findById: jest.Mock };
  let schedules: { findById: jest.Mock };
  let unitOfWork: { run: jest.Mock };
  let service: ClassesService;

  beforeEach(() => {
    classes = {
      findDetails: jest.fn().mockResolvedValue({ class_id: 5, students: [] }),
      exists: jest.fn().mockResolvedValue(true),
      findAssignable: jest
        .fn()
        .mockResolvedValue({ students: [], teachers: [] }),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn().mockResolvedValue(true),
      isTeacherOf: jest.fn().mockResolvedValue(false),
      findStudents: jest.fn((ids: number[]) =>
        Promise.resolve(
          ids.map((student_id) => ({ student_id, class_id: null })),
        ),
      ),
      findTeacherIds: jest.fn((ids: number[]) => Promise.resolve(ids)),
      replaceStudents: jest.fn(),
      replaceTeachers: jest.fn(),
    };
    permissions = {
      hasPermission: jest.fn((userId: number) =>
        Promise.resolve(userId === ADMIN),
      ),
    };
    departments = { findById: jest.fn().mockResolvedValue({}) };
    schedules = { findById: jest.fn().mockResolvedValue({}) };
    unitOfWork = { run: jest.fn((work: () => unknown) => work()) };
    service = new ClassesService(
      classes as unknown as ClassRepository,
      departments as unknown as DepartmentRepository,
      schedules as unknown as ScheduleRepository,
      permissions as unknown as PermissionsService,
      unitOfWork as unknown as UnitOfWork,
    );
  });

  it("lets manage_classes replace the students in one unit of work", async () => {
    await service.replaceStudents(5, [7, 8], ADMIN);

    expect(permissions.hasPermission).toHaveBeenCalledWith(
      ADMIN,
      "manage_classes",
      2, // PermissionFlag.WRITE
    );
    expect(classes.replaceStudents).toHaveBeenCalledWith(5, [7, 8]);
    expect(unitOfWork.run).toHaveBeenCalledTimes(1);
  });

  // review M36: the move out of another class is the administration's
  it("lets a teacher add unassigned students but not take them from another class", async () => {
    classes.isTeacherOf.mockResolvedValue(true);
    classes.findStudents.mockResolvedValue([
      { student_id: 7, class_id: null },
      { student_id: 8, class_id: 5 },
    ]);
    await service.replaceStudents(5, [7, 8], TEACHER);
    expect(classes.replaceStudents).toHaveBeenCalledWith(5, [7, 8]);

    classes.findStudents.mockResolvedValue([{ student_id: 9, class_id: 6 }]);
    await expect(service.replaceStudents(5, [9], TEACHER)).rejects.toThrow(
      ForbiddenException,
    );
    // the administration may move them
    await service.replaceStudents(5, [9], ADMIN);
    expect(classes.replaceStudents).toHaveBeenLastCalledWith(5, [9]);
  });

  // review M36: the list of all students is for staff only
  it("shows the assignable people to managers and teachers only", async () => {
    await service.findAssignable(ADMIN);
    classes.findTeacherIds.mockResolvedValue([TEACHER]);
    await service.findAssignable(TEACHER);
    expect(classes.findAssignable).toHaveBeenCalledTimes(2);

    classes.findTeacherIds.mockResolvedValue([]);
    await expect(service.findAssignable(4)).rejects.toThrow(ForbiddenException);
  });

  it("lets a teacher of the class change its teachers (UC-20)", async () => {
    classes.isTeacherOf.mockResolvedValue(true);

    await service.replaceTeachers(5, [2, 3], TEACHER);

    expect(classes.isTeacherOf).toHaveBeenCalledWith(5, TEACHER);
    expect(classes.replaceTeachers).toHaveBeenCalledWith(5, [2, 3]);
  });

  it("refuses everyone else with 403 and changes nothing", async () => {
    await expect(service.replaceStudents(5, [7], TEACHER)).rejects.toThrow(
      ForbiddenException,
    );
    expect(classes.replaceStudents).not.toHaveBeenCalled();
  });

  it("refuses users without a student or teacher profile with 400", async () => {
    classes.findStudents.mockResolvedValue([{ student_id: 7, class_id: null }]);
    await expect(service.replaceStudents(5, [7, 1], ADMIN)).rejects.toThrow(
      new BadRequestException("Kein Schülerprofil: 1"),
    );
    classes.findTeacherIds.mockResolvedValue([]);
    await expect(service.replaceTeachers(5, [4], ADMIN)).rejects.toThrow(
      BadRequestException,
    );
  });

  it("answers 404 for a missing class", async () => {
    classes.findDetails.mockResolvedValue(null);
    classes.exists.mockResolvedValue(false);

    await expect(service.findOne(9)).rejects.toThrow(NotFoundException);
    await expect(service.replaceStudents(9, [], ADMIN)).rejects.toThrow(
      NotFoundException,
    );
  });

  it("checks department, schedule and head teacher before creating", async () => {
    departments.findById.mockResolvedValue(null);
    await expect(
      service.create({ name: "1A", department_id: 9 }),
    ).rejects.toThrow("Abteilung 9 nicht gefunden");

    departments.findById.mockResolvedValue({});
    classes.findTeacherIds.mockResolvedValue([]);
    await expect(
      service.create({ name: "1A", head_teacher_id: 4 }),
    ).rejects.toThrow("Kein Lehrerprofil: 4");
    expect(classes.create).not.toHaveBeenCalled();
  });

  it("answers 409 when a class can't be deleted", async () => {
    classes.delete.mockResolvedValue(false);

    await expect(service.remove(5)).rejects.toThrow(ConflictException);
  });
});
