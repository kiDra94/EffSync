import { Injectable } from "@nestjs/common";
import { PrismaUnitOfWork } from "../../../../shared/infrastructure/prisma/prisma-unit-of-work";
import {
  NoteData,
  NoteRepository,
} from "../../application/ports/note.repository";

// M19: the include had `tasks`, a relation notes don't have, so every read
// with relations failed
const RELATIONS = {
  users: {
    select: {
      user_id: true,
      email: true,
      username: true,
      firstname: true,
      lastname: true,
    },
  },
  subjects: { select: { subject_id: true, name: true, short_name: true } },
  priorities: { select: { priority_id: true, name: true } },
} as const;

const relationsIf = (includeRelations: boolean) =>
  includeRelations ? RELATIONS : undefined;

/** Notes on Prisma: the queries NotesService made before M19. */
@Injectable()
export class PrismaNoteRepository extends NoteRepository {
  constructor(private readonly unitOfWork: PrismaUnitOfWork) {
    super();
  }

  private get db() {
    return this.unitOfWork.client();
  }

  async subjectExists(subjectId: number) {
    return !!(await this.db.subjects.findUnique({
      where: { subject_id: subjectId },
    }));
  }

  async findPriorityIdByNames(names: string[]) {
    const found = await this.db.priorities.findFirst({
      where: { name: { in: names } },
      orderBy: { priority_id: "asc" },
    });
    return found?.priority_id ?? null;
  }

  create(data: NoteData, userId: number, includeRelations: boolean) {
    return this.db.notes.create({
      data: { ...data, created_by: userId },
      include: relationsIf(includeRelations),
    });
  }

  findAllOf(
    userId: number,
    subjectId: number | undefined,
    includeRelations: boolean,
  ) {
    return this.db.notes.findMany({
      where: {
        created_by: userId,
        ...(typeof subjectId === "number" && { subject_id: subjectId }),
      },
      include: relationsIf(includeRelations),
      orderBy: { created_at: "desc" },
    });
  }

  findOwn(noteId: number, userId: number, includeRelations: boolean) {
    return this.db.notes.findFirst({
      where: { note_id: noteId, created_by: userId },
      include: relationsIf(includeRelations),
    });
  }

  update(noteId: number, data: Partial<NoteData>, includeRelations: boolean) {
    return this.db.notes.update({
      where: { note_id: noteId },
      data: { ...data, updated_at: new Date() },
      include: relationsIf(includeRelations),
    });
  }

  async delete(noteId: number) {
    const tx = this.db;
    // M19: the links first, the foreign keys are NoAction
    await tx.note_documents.deleteMany({ where: { note_id: noteId } });
    await tx.notes_users.deleteMany({ where: { note_id: noteId } });
    await tx.notes.delete({ where: { note_id: noteId } });
  }
}
