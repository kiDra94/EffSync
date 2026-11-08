import { Injectable } from "@nestjs/common";
import { PrismaUnitOfWork } from "../../../../shared/infrastructure/prisma/prisma-unit-of-work";
import { ClassRepository } from "../../application/ports/class.repository";
import type { Person } from "../../application/ports/school-records";
import type { ClassInput } from "../../application/school-inputs";
import { deleteUnlessReferenced } from "./in-use";

/** A person's name, never the e-mail (the school views list many people). */
const PERSON = {
  user_id: true,
  firstname: true,
  lastname: true,
  username: true,
} as const;
const TEACHER_USER = {
  users_teachers_teacher_idTousers: { select: PERSON },
} as const;
const byName = (a: Person, b: Person) =>
  `${a.lastname} ${a.firstname}`.localeCompare(`${b.lastname} ${b.firstname}`);

/** Classes and their members on Prisma (M36). */
@Injectable()
export class PrismaClassRepository extends ClassRepository {
  constructor(private readonly unitOfWork: PrismaUnitOfWork) {
    super();
  }

  private get db() {
    return this.unitOfWork.client();
  }

  async findAll() {
    const classes = await this.db.classes.findMany({
      include: {
        departments: { select: { department_id: true, name: true } },
        teachers: { select: TEACHER_USER },
        _count: { select: { students: true, classes_teachers: true } },
      },
      orderBy: { name: "asc" },
    });
    return classes.map(
      ({
        departments,
        teachers,
        _count,
        created_at: _c,
        updated_at: _u,
        ...row
      }) => ({
        ...row,
        department: departments,
        head_teacher: teachers?.users_teachers_teacher_idTousers ?? null,
        student_count: _count.students,
        teacher_count: _count.classes_teachers,
      }),
    );
  }

  async findDetails(classId: number) {
    const found = await this.db.classes.findUnique({
      where: { class_id: classId },
      include: {
        departments: { select: { department_id: true, name: true } },
        schedules: {
          select: {
            schedule_id: true,
            name: true,
            valid_from: true,
            valid_to: true,
          },
        },
        teachers: { select: TEACHER_USER },
        students: { select: { users: { select: PERSON } } },
        classes_teachers: { select: { teachers: { select: TEACHER_USER } } },
      },
    });
    if (!found) return null;
    const {
      departments,
      schedules,
      teachers,
      students,
      classes_teachers,
      created_at: _c,
      updated_at: _u,
      ...row
    } = found;
    return {
      ...row,
      department: departments,
      schedule: schedules,
      head_teacher: teachers?.users_teachers_teacher_idTousers ?? null,
      students: students.map((s) => s.users).sort(byName),
      teachers: classes_teachers
        .map((t) => t.teachers.users_teachers_teacher_idTousers)
        .sort(byName),
    };
  }

  create(data: ClassInput & { name: string }) {
    return this.db.classes.create({ data });
  }

  update(classId: number, data: ClassInput) {
    return this.db.classes.update({
      where: { class_id: classId },
      data: { ...data, updated_at: new Date() },
    });
  }

  // its own transaction, outside any open one: a foreign key error aborts
  // the transaction, so it must end with the error (and roll back)
  delete(classId: number) {
    return deleteUnlessReferenced(() =>
      this.unitOfWork.run(async () => {
        const tx = this.db;
        await tx.students.updateMany({
          where: { class_id: classId },
          data: { class_id: null },
        });
        await tx.classes_teachers.deleteMany({ where: { class_id: classId } });
        await tx.classes.delete({ where: { class_id: classId } });
      }),
    );
  }

  async isTeacherOf(classId: number, userId: number) {
    const [heads, teaches] = await Promise.all([
      this.db.classes.count({
        where: { class_id: classId, head_teacher_id: userId },
      }),
      this.db.classes_teachers.count({
        where: { class_id: classId, teacher_id: userId },
      }),
    ]);
    return heads + teaches > 0;
  }

  async exists(classId: number) {
    return (await this.db.classes.count({ where: { class_id: classId } })) > 0;
  }

  findStudents(userIds: number[]) {
    return this.db.students.findMany({
      where: { student_id: { in: userIds } },
      select: { student_id: true, class_id: true },
    });
  }

  async findTeacherIds(userIds: number[]) {
    const rows = await this.db.teachers.findMany({
      where: { teacher_id: { in: userIds } },
      select: { teacher_id: true },
    });
    return rows.map((row) => row.teacher_id);
  }

  async replaceStudents(classId: number, studentIds: number[]) {
    const tx = this.db;
    await tx.students.updateMany({
      where: { class_id: classId, student_id: { notIn: studentIds } },
      data: { class_id: null, updated_at: new Date() },
    });
    await tx.students.updateMany({
      where: { student_id: { in: studentIds } },
      data: { class_id: classId, updated_at: new Date() },
    });
  }

  async replaceTeachers(classId: number, teacherIds: number[]) {
    const tx = this.db;
    await tx.classes_teachers.deleteMany({
      where: { class_id: classId, teacher_id: { notIn: teacherIds } },
    });
    await tx.classes_teachers.createMany({
      data: teacherIds.map((teacher_id) => ({ class_id: classId, teacher_id })),
      skipDuplicates: true,
    });
  }

  async findAssignable() {
    const [students, teachers] = await Promise.all([
      this.db.students.findMany({
        select: { class_id: true, users: { select: PERSON } },
      }),
      this.db.teachers.findMany({ select: TEACHER_USER }),
    ]);
    return {
      students: students
        .map((s) => ({ ...s.users, class_id: s.class_id }))
        .sort(byName),
      teachers: teachers
        .map((t) => t.users_teachers_teacher_idTousers)
        .sort(byName),
    };
  }
}
