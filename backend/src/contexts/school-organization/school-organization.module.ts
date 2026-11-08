import { Module } from "@nestjs/common";
import { PrismaModule } from "../../shared/infrastructure/prisma/prisma.module";
import { ClassesService } from "./application/classes.service";
import { DepartmentsService } from "./application/departments.service";
import { LessonSlotService } from "./application/lesson-slots.service";
import { LessonSlotRepository } from "./application/ports/lesson-slot.repository";
import { ScheduleRepository } from "./application/ports/schedule.repository";
import { RoomsService } from "./application/room.service";
import { SchedulesService } from "./application/schedules.service";
import { SubjectsService } from "./application/subjects.service";
import { PrismaLessonSlotRepository } from "./infrastructure/persistence/prisma-lesson-slot.repository";
import { PrismaScheduleRepository } from "./infrastructure/persistence/prisma-schedule.repository";
import { SchoolAccountDeletion } from "./application/school-account-deletion";
import { SchoolProfileRepository } from "./application/ports/school-profile.repository";
import { PrismaSchoolProfileRepository } from "./infrastructure/persistence/prisma-school-profile.repository";
import { ClassesController } from "./presentation/classes.controller";
import { DepartmentsController } from "./presentation/departments.controller";
import { LessonSlotController } from "./presentation/lesson-slots.controller";
import { RoomsController } from "./presentation/room.controller";
import { SchedulesController } from "./presentation/schedules.controller";
import { SubjectsController } from "./presentation/subjects.controller";

/**
 * school-organization (GOALS.md M22, features from 05_…:60): classes,
 * departments, subjects, rooms, schedules and lesson slots. Classes,
 * departments, subjects and rooms are stubs until M36.
 */
@Module({
  imports: [PrismaModule],
  // in the order of the modules they replace, so GET /api-json stays the same
  controllers: [
    SchedulesController,
    ClassesController,
    DepartmentsController,
    LessonSlotController,
    RoomsController,
    SubjectsController,
  ],
  providers: [
    ClassesService,
    DepartmentsService,
    SubjectsService,
    RoomsService,
    SchedulesService,
    LessonSlotService,
    SchoolAccountDeletion,
    { provide: ScheduleRepository, useClass: PrismaScheduleRepository },
    { provide: LessonSlotRepository, useClass: PrismaLessonSlotRepository },
    {
      provide: SchoolProfileRepository,
      useClass: PrismaSchoolProfileRepository,
    },
  ],
})
export class SchoolOrganizationModule {}
