import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  PermissionFlag,
  PermissionsService,
} from "../../identity-access/application";
import { UnitOfWork } from "../../../shared/application/unit-of-work";
import { ClassRepository } from "./ports/class.repository";
import { DepartmentRepository } from "./ports/school-catalog.repository";
import { ScheduleRepository } from "./ports/schedule.repository";
import type { ClassInput } from "./school-inputs";

/**
 * Classes and their members (T26, decisions D1 and D2, M36). Admin and
 * Superuser manage all classes (manage_classes); a teacher changes the
 * membership of the classes they head or teach (UC-20).
 */
@Injectable()
export class ClassesService {
  constructor(
    private readonly classes: ClassRepository,
    private readonly departments: DepartmentRepository,
    private readonly schedules: ScheduleRepository,
    private readonly permissions: PermissionsService,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async create(input: ClassInput & { name: string }) {
    await this.assertReferences(input);
    return this.classes.create(input);
  }

  findAll() {
    return this.classes.findAll();
  }

  async findOne(id: number) {
    const details = await this.classes.findDetails(id);
    if (!details) throw new NotFoundException(`Klasse ${id} nicht gefunden`);
    return details;
  }

  async update(id: number, input: ClassInput) {
    await this.assertExists(id);
    await this.assertReferences(input);
    return this.classes.update(id, input);
  }

  async remove(id: number) {
    await this.assertExists(id);
    if (!(await this.classes.delete(id))) {
      throw new ConflictException(
        `Klasse ${id} wird noch verwendet (z. B. von einem Klassenchat)`,
      );
    }
    return { message: "Klasse gelöscht", class_id: id };
  }

  /** For class managers and teachers only: the names of all students (review M36). */
  async findAssignable(userId: number) {
    if (
      !(await this.manages(userId)) &&
      (await this.classes.findTeacherIds([userId])).length === 0
    ) {
      throw new ForbiddenException(
        "Nur Lehrkräfte und die Verwaltung sehen die Schülerliste",
      );
    }
    return this.classes.findAssignable();
  }

  /** The class's students become exactly these (they leave their old class). */
  async replaceStudents(id: number, studentIds: number[], userId: number) {
    const manager = await this.assertMayChangeMembers(id, userId);
    // the profile checks run in the transaction that writes (review M36)
    await this.unitOfWork.run(async () => {
      const students = await this.classes.findStudents(studentIds);
      this.assertAll(
        studentIds,
        students.map((student) => student.student_id),
        "Kein Schülerprofil",
      );
      // a teacher takes no student out of another class (review M36)
      const fromOtherClasses = students.filter(
        (student) => student.class_id !== null && student.class_id !== id,
      );
      if (!manager && fromOtherClasses.length > 0) {
        throw new ForbiddenException(
          "Schüler einer anderen Klasse setzt nur die Verwaltung um",
        );
      }
      await this.classes.replaceStudents(id, studentIds);
    });
    return this.findOne(id);
  }

  /** The class's teachers become exactly these. */
  async replaceTeachers(id: number, teacherIds: number[], userId: number) {
    await this.assertMayChangeMembers(id, userId);
    await this.unitOfWork.run(async () => {
      this.assertAll(
        teacherIds,
        await this.classes.findTeacherIds(teacherIds),
        "Kein Lehrerprofil",
      );
      await this.classes.replaceTeachers(id, teacherIds);
    });
    return this.findOne(id);
  }

  private manages(userId: number) {
    return this.permissions.hasPermission(
      userId,
      "manage_classes",
      PermissionFlag.WRITE,
    );
  }

  private async assertExists(id: number) {
    if (!(await this.classes.exists(id))) {
      throw new NotFoundException(`Klasse ${id} nicht gefunden`);
    }
  }

  /** True for manage_classes, false for a teacher of the class, else 403. */
  private async assertMayChangeMembers(classId: number, userId: number) {
    await this.assertExists(classId);
    if (await this.manages(userId)) return true;
    if (await this.classes.isTeacherOf(classId, userId)) return false;
    throw new ForbiddenException(
      "Nur Lehrkräfte dieser Klasse oder die Verwaltung ändern die Mitglieder",
    );
  }

  private assertAll(requested: number[], found: number[], label: string) {
    const missing = requested.filter((id) => !found.includes(id));
    if (missing.length > 0) {
      throw new BadRequestException(`${label}: ${missing.join(", ")}`);
    }
  }

  /** Department, schedule and head teacher must exist (else 400, not a 500). */
  private async assertReferences(input: ClassInput) {
    if (
      input.department_id &&
      !(await this.departments.findById(input.department_id))
    ) {
      throw new BadRequestException(
        `Abteilung ${input.department_id} nicht gefunden`,
      );
    }
    if (
      input.schedule_id &&
      !(await this.schedules.findById(input.schedule_id))
    ) {
      throw new BadRequestException(
        `Stundenplan ${input.schedule_id} nicht gefunden`,
      );
    }
    if (input.head_teacher_id) {
      this.assertAll(
        [input.head_teacher_id],
        await this.classes.findTeacherIds([input.head_teacher_id]),
        "Kein Lehrerprofil",
      );
    }
  }
}
