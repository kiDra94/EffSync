import type {
  DepartmentInput,
  RoomInput,
  SubjectInput,
} from "../school-inputs";
import type {
  DepartmentRecord,
  DepartmentWithCount,
  RoomRecord,
  SubjectRecord,
} from "./school-records";

/**
 * The plain school catalogs (port; Prisma in infrastructure). A delete
 * answers false while other rows still refer to the entry.
 */
export abstract class DepartmentRepository {
  abstract findAll(): Promise<DepartmentWithCount[]>;
  abstract findById(departmentId: number): Promise<DepartmentRecord | null>;
  abstract create(
    data: DepartmentInput & { name: string },
  ): Promise<DepartmentRecord>;
  abstract update(
    departmentId: number,
    data: DepartmentInput,
  ): Promise<DepartmentRecord>;
  abstract delete(departmentId: number): Promise<boolean>;
}

export abstract class SubjectRepository {
  abstract findAll(): Promise<SubjectRecord[]>;
  abstract findById(subjectId: number): Promise<SubjectRecord | null>;
  abstract create(
    data: SubjectInput & { name: string },
  ): Promise<SubjectRecord>;
  abstract update(
    subjectId: number,
    data: SubjectInput,
  ): Promise<SubjectRecord>;
  abstract delete(subjectId: number): Promise<boolean>;
}

export abstract class RoomRepository {
  abstract findAll(): Promise<RoomRecord[]>;
  abstract findById(roomId: number): Promise<RoomRecord | null>;
  abstract create(data: RoomInput & { name: string }): Promise<RoomRecord>;
  abstract update(roomId: number, data: RoomInput): Promise<RoomRecord>;
  abstract delete(roomId: number): Promise<boolean>;
}
