import { Injectable } from "@nestjs/common";
import { PrismaUnitOfWork } from "../../../../shared/infrastructure/prisma/prisma-unit-of-work";
import {
  DepartmentRepository,
  RoomRepository,
  SubjectRepository,
} from "../../application/ports/school-catalog.repository";
import type {
  DepartmentInput,
  RoomInput,
  SubjectInput,
} from "../../application/school-inputs";
import { deleteUnlessReferenced } from "./in-use";

const ORDER_BY_NAME = { orderBy: { name: "asc" as const } };

/** Departments on Prisma (M36), with the number of their classes. */
@Injectable()
export class PrismaDepartmentRepository extends DepartmentRepository {
  constructor(private readonly unitOfWork: PrismaUnitOfWork) {
    super();
  }

  private get db() {
    return this.unitOfWork.client();
  }

  async findAll() {
    const rows = await this.db.departments.findMany({
      include: { _count: { select: { classes: true } } },
      ...ORDER_BY_NAME,
    });
    return rows.map(({ _count, ...row }) => ({
      ...row,
      class_count: _count.classes,
    }));
  }

  findById(departmentId: number) {
    return this.db.departments.findUnique({
      where: { department_id: departmentId },
    });
  }

  create(data: DepartmentInput & { name: string }) {
    return this.db.departments.create({ data });
  }

  update(departmentId: number, data: DepartmentInput) {
    return this.db.departments.update({
      where: { department_id: departmentId },
      data: { ...data, updated_at: new Date() },
    });
  }

  delete(departmentId: number) {
    return deleteUnlessReferenced(() =>
      this.db.departments.delete({ where: { department_id: departmentId } }),
    );
  }
}

/** Subjects on Prisma (M36). */
@Injectable()
export class PrismaSubjectRepository extends SubjectRepository {
  constructor(private readonly unitOfWork: PrismaUnitOfWork) {
    super();
  }

  private get db() {
    return this.unitOfWork.client();
  }

  findAll() {
    return this.db.subjects.findMany(ORDER_BY_NAME);
  }

  findById(subjectId: number) {
    return this.db.subjects.findUnique({ where: { subject_id: subjectId } });
  }

  create(data: SubjectInput & { name: string }) {
    return this.db.subjects.create({ data });
  }

  update(subjectId: number, data: SubjectInput) {
    return this.db.subjects.update({
      where: { subject_id: subjectId },
      data: { ...data, updated_at: new Date() },
    });
  }

  delete(subjectId: number) {
    return deleteUnlessReferenced(() =>
      this.db.subjects.delete({ where: { subject_id: subjectId } }),
    );
  }
}

/** Rooms on Prisma (M36). */
@Injectable()
export class PrismaRoomRepository extends RoomRepository {
  constructor(private readonly unitOfWork: PrismaUnitOfWork) {
    super();
  }

  private get db() {
    return this.unitOfWork.client();
  }

  findAll() {
    return this.db.rooms.findMany(ORDER_BY_NAME);
  }

  findById(roomId: number) {
    return this.db.rooms.findUnique({ where: { room_id: roomId } });
  }

  create(data: RoomInput & { name: string }) {
    return this.db.rooms.create({ data });
  }

  update(roomId: number, data: RoomInput) {
    return this.db.rooms.update({
      where: { room_id: roomId },
      data: { ...data, updated_at: new Date() },
    });
  }

  delete(roomId: number) {
    return deleteUnlessReferenced(() =>
      this.db.rooms.delete({ where: { room_id: roomId } }),
    );
  }
}
