import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateScheduleDto } from "./dto/create-schedule.dto";
import { UpdateScheduleDto } from "./dto/update-schedule.dto";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createScheduleDto: CreateScheduleDto) {
    const { name, valid_from, valid_to } = createScheduleDto;

    // Validation: valid_from must be before valid_to
    if (valid_from && valid_to && new Date(valid_from) > new Date(valid_to)) {
      throw new BadRequestException(
        "Startdatum (valid_from) muss vor Enddatum (valid_to) liegen",
      );
    }

    const schedule = await this.prisma.schedules.create({
      data: {
        name,
        valid_from: valid_from ? new Date(valid_from) : null,
        valid_to: valid_to ? new Date(valid_to) : null,
      },
      include: {
        classes: true,
        lesson_slots: true,
      },
    });

    return schedule;
  }

  async findAll() {
    const schedules = await this.prisma.schedules.findMany({
      include: {
        classes: true,
        lesson_slots: {
          include: {},
        },
      },
      orderBy: { created_at: "desc" },
    });

    return schedules;
  }

  async findOne(id: number) {
    const schedule = await this.prisma.schedules.findUnique({
      where: { schedule_id: id },
      include: {
        classes: {
          include: {
            students: {
              include: {
                users: true,
              },
            },
          },
        },
        lesson_slots: {
          include: {},
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException(`Stundenplan mit ID ${id} nicht gefunden`);
    }

    return schedule;
  }

  async update(id: number, updateScheduleDto: UpdateScheduleDto) {
    const schedule = await this.prisma.schedules.findUnique({
      where: { schedule_id: id },
    });

    if (!schedule) {
      throw new NotFoundException(`Stundenplan mit ID ${id} nicht gefunden`);
    }

    const { name, valid_from, valid_to } = updateScheduleDto;

    // Validation: valid_from must be before valid_to
    const fromDate = valid_from ? new Date(valid_from) : schedule.valid_from;
    const toDate = valid_to ? new Date(valid_to) : schedule.valid_to;

    if (fromDate && toDate && fromDate > toDate) {
      throw new BadRequestException(
        "Startdatum (valid_from) muss vor Enddatum (valid_to) liegen",
      );
    }

    const updatedSchedule = await this.prisma.schedules.update({
      where: { schedule_id: id },
      data: {
        name: name ?? schedule.name,
        valid_from: valid_from ? new Date(valid_from) : schedule.valid_from,
        valid_to: valid_to ? new Date(valid_to) : schedule.valid_to,
        updated_at: new Date(),
      },
      include: {
        classes: true,
        lesson_slots: true,
      },
    });

    return updatedSchedule;
  }

  async remove(id: number) {
    const schedule = await this.prisma.schedules.findUnique({
      where: { schedule_id: id },
    });

    if (!schedule) {
      throw new NotFoundException(`Stundenplan mit ID ${id} nicht gefunden`);
    }

    // Check whether the schedule is still in use
    const lessonSlotsCount = await this.prisma.lesson_slots.count({
      where: { schedule_id: id },
    });

    if (lessonSlotsCount > 0) {
      throw new BadRequestException(
        `Stundenplan kann nicht gelöscht werden, da ${lessonSlotsCount} Stunden darin definiert sind`,
      );
    }

    const deletedSchedule = await this.prisma.schedules.delete({
      where: { schedule_id: id },
    });

    return deletedSchedule;
  }
}
