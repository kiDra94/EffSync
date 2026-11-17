import { Injectable } from "@nestjs/common";
import { ClassRepository } from "./ports/class.repository";

/** A class's chat as communication needs it (T29, decision D2, M21). */
interface ClassChatInfo {
  name: string | null;
  /** owns the class chat */
  headTeacherId: number | null;
  /** students, teachers and the head teacher, without duplicates */
  memberIds: number[];
}

/**
 * The class side of a class chat (T29, M21): its members are the class's
 * students, teachers and head teacher from M36 (decision D2).
 */
@Injectable()
export class ClassChatService {
  constructor(private readonly classes: ClassRepository) {}

  /** null if the class doesn't exist. */
  async forChat(classId: number): Promise<ClassChatInfo | null> {
    const details = await this.classes.findDetails(classId);
    if (!details) return null;
    const ids = [
      ...details.students.map((student) => student.user_id),
      ...details.teachers.map((teacher) => teacher.user_id),
      details.head_teacher?.user_id,
    ].filter((id): id is number => typeof id === "number");
    return {
      name: details.name,
      headTeacherId: details.head_teacher?.user_id ?? null,
      memberIds: [...new Set(ids)],
    };
  }
}
