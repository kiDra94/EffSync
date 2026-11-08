import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import { PrismaUnitOfWork } from "../../../shared/infrastructure/prisma/prisma-unit-of-work";
import { PrismaScheduleRepository } from "../infrastructure/persistence/prisma-schedule.repository";
import { SchedulesService } from "./schedules.service";

// the schedule rules (pinned in M22 before the move; they were untested)
describe("SchedulesService", () => {
  let service: SchedulesService;

  const createMock = () => ({
    schedules: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    lesson_slots: { count: jest.fn() },
  });
  let mockPrismaService: ReturnType<typeof createMock>;
  const WITH_CLASSES_AND_SLOTS = { classes: true, lesson_slots: true };

  beforeEach(() => {
    // a fresh mock per test, so no return value carries over
    mockPrismaService = createMock();
    service = new SchedulesService(
      new PrismaScheduleRepository(
        new PrismaUnitOfWork(mockPrismaService as unknown as PrismaService),
      ),
    );
  });

  it("creates a schedule with its period as dates", async () => {
    await service.create({
      name: "Sommersemester",
      valid_from: "2026-02-01",
      valid_to: "2026-07-01",
    });

    expect(mockPrismaService.schedules.create).toHaveBeenCalledWith({
      data: {
        name: "Sommersemester",
        valid_from: new Date("2026-02-01"),
        valid_to: new Date("2026-07-01"),
      },
      include: WITH_CLASSES_AND_SLOTS,
    });
  });

  it("refuses a period that ends before it starts", async () => {
    await expect(
      service.create({
        name: "X",
        valid_from: "2026-07-01",
        valid_to: "2026-02-01",
      }),
    ).rejects.toThrow(BadRequestException);
    expect(mockPrismaService.schedules.create).not.toHaveBeenCalled();
  });

  it("answers 404 for a missing schedule", async () => {
    mockPrismaService.schedules.findUnique.mockResolvedValue(null);

    await expect(service.findOne(9)).rejects.toThrow(NotFoundException);
    await expect(service.update(9, { name: "x" })).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.remove(9)).rejects.toThrow(NotFoundException);
  });

  it("checks the new period against the stored end on update", async () => {
    mockPrismaService.schedules.findUnique.mockResolvedValue({
      schedule_id: 1,
      name: "S",
      valid_from: new Date("2026-02-01"),
      valid_to: new Date("2026-07-01"),
    });

    await expect(
      service.update(1, { valid_from: "2026-08-01" }),
    ).rejects.toThrow(BadRequestException);

    await service.update(1, { name: "Neu" });
    expect(mockPrismaService.schedules.update).toHaveBeenCalledWith({
      where: { schedule_id: 1 },
      data: {
        name: "Neu",
        valid_from: new Date("2026-02-01"),
        valid_to: new Date("2026-07-01"),
        updated_at: expect.any(Date) as unknown,
      },
      include: WITH_CLASSES_AND_SLOTS,
    });
  });

  it("deletes only a schedule without lessons", async () => {
    mockPrismaService.schedules.findUnique.mockResolvedValue({
      schedule_id: 1,
    });
    mockPrismaService.lesson_slots.count.mockResolvedValue(3);

    await expect(service.remove(1)).rejects.toThrow(
      "Stundenplan kann nicht gelöscht werden, da 3 Stunden darin definiert sind",
    );

    mockPrismaService.lesson_slots.count.mockResolvedValue(0);
    mockPrismaService.schedules.delete.mockResolvedValue({ schedule_id: 1 });
    await service.remove(1);
    expect(mockPrismaService.schedules.delete).toHaveBeenCalledWith({
      where: { schedule_id: 1 },
    });
  });
});
