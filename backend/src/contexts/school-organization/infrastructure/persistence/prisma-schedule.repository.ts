import { Injectable } from "@nestjs/common";
import { PrismaUnitOfWork } from "../../../../shared/infrastructure/prisma/prisma-unit-of-work";
import {
  ScheduleRepository,
  type ScheduleData,
} from "../../application/ports/schedule.repository";

const WITH_CLASSES_AND_SLOTS = { classes: true, lesson_slots: true } as const;

/** Schedules on Prisma: the queries SchedulesService made before M22. */
@Injectable()
export class PrismaScheduleRepository extends ScheduleRepository {
  constructor(private readonly unitOfWork: PrismaUnitOfWork) {
    super();
  }

  private get db() {
    return this.unitOfWork.client();
  }

  create(data: ScheduleData) {
    return this.db.schedules.create({
      data,
      include: WITH_CLASSES_AND_SLOTS,
    });
  }

  findAll() {
    return this.db.schedules.findMany({
      include: WITH_CLASSES_AND_SLOTS,
      orderBy: { created_at: "desc" },
    });
  }

  findDetailed(scheduleId: number) {
    return this.db.schedules.findUnique({
      where: { schedule_id: scheduleId },
      include: {
        classes: { include: { students: { include: { users: true } } } },
        lesson_slots: true,
      },
    });
  }

  findById(scheduleId: number) {
    return this.db.schedules.findUnique({
      where: { schedule_id: scheduleId },
    });
  }

  update(scheduleId: number, data: ScheduleData) {
    return this.db.schedules.update({
      where: { schedule_id: scheduleId },
      data: { ...data, updated_at: new Date() },
      include: WITH_CLASSES_AND_SLOTS,
    });
  }

  delete(scheduleId: number) {
    return this.db.schedules.delete({ where: { schedule_id: scheduleId } });
  }

  countLessonSlots(scheduleId: number) {
    return this.db.lesson_slots.count({ where: { schedule_id: scheduleId } });
  }
}
