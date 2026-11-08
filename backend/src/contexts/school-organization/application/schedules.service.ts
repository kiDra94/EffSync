import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { isValidPeriod } from "../domain/schedule-period";
import { ScheduleRepository } from "./ports/schedule.repository";
import type { ScheduleInput } from "./school-inputs";

const INVALID_PERIOD =
  "Startdatum (valid_from) muss vor Enddatum (valid_to) liegen";

/** The given dates, else the stored ones; 400 if it ends before it starts. */
function period(
  input: ScheduleInput,
  storedFrom: Date | null,
  storedTo: Date | null,
) {
  const validFrom = input.valid_from ? new Date(input.valid_from) : storedFrom;
  const validTo = input.valid_to ? new Date(input.valid_to) : storedTo;
  if (!isValidPeriod(validFrom, validTo)) {
    throw new BadRequestException(INVALID_PERIOD);
  }
  return { validFrom, validTo };
}

@Injectable()
export class SchedulesService {
  constructor(private readonly schedules: ScheduleRepository) {}

  async create(input: ScheduleInput & { name: string }) {
    const { validFrom, validTo } = period(input, null, null);
    return this.schedules.create({
      name: input.name,
      valid_from: validFrom,
      valid_to: validTo,
    });
  }

  findAll() {
    return this.schedules.findAll();
  }

  async findOne(id: number) {
    const schedule = await this.schedules.findDetailed(id);
    if (!schedule) {
      throw new NotFoundException(`Stundenplan mit ID ${id} nicht gefunden`);
    }
    return schedule;
  }

  async update(id: number, input: ScheduleInput) {
    const schedule = await this.findExisting(id);

    const { validFrom, validTo } = period(
      input,
      schedule.valid_from,
      schedule.valid_to,
    );
    return this.schedules.update(id, {
      name: input.name ?? schedule.name,
      valid_from: validFrom,
      valid_to: validTo,
    });
  }

  async remove(id: number) {
    await this.findExisting(id);

    // a schedule with lessons is still in use
    const lessonSlotsCount = await this.schedules.countLessonSlots(id);
    if (lessonSlotsCount > 0) {
      throw new BadRequestException(
        `Stundenplan kann nicht gelöscht werden, da ${lessonSlotsCount} Stunden darin definiert sind`,
      );
    }
    return this.schedules.delete(id);
  }

  private async findExisting(id: number) {
    const schedule = await this.schedules.findById(id);
    if (!schedule) {
      throw new NotFoundException(`Stundenplan mit ID ${id} nicht gefunden`);
    }
    return schedule;
  }
}
