import { Injectable } from "@nestjs/common";
import { PrismaUnitOfWork } from "../../../../shared/infrastructure/prisma/prisma-unit-of-work";
import { SchoolProfileRepository } from "../../application/ports/school-profile.repository";

/** Profiles on Prisma: the queries PrismaUserRepository made before M22. */
@Injectable()
export class PrismaSchoolProfileRepository extends SchoolProfileRepository {
  constructor(private readonly unitOfWork: PrismaUnitOfWork) {
    super();
  }

  private get db() {
    return this.unitOfWork.client();
  }

  async lockTeacher(userId: number) {
    await this.db
      .$queryRaw`SELECT 1 FROM "teachers" WHERE "teacher_id" = ${userId} FOR UPDATE`;
  }

  async countTeacherAssignments(userId: number) {
    const db = this.db;
    const [headOf, teaches, slots] = await Promise.all([
      db.classes.count({ where: { head_teacher_id: userId } }),
      db.classes_teachers.count({ where: { teacher_id: userId } }),
      db.lesson_slots.count({ where: { teacher_id: userId } }),
    ]);
    return headOf + teaches + slots;
  }

  async clearSupervisor(userId: number) {
    await this.db.teachers.updateMany({
      where: { supervisor_id: userId },
      data: { supervisor_id: null },
    });
  }

  async deleteProfiles(userId: number) {
    await this.db.students.deleteMany({ where: { student_id: userId } });
    await this.db.teachers.deleteMany({ where: { teacher_id: userId } });
  }
}
