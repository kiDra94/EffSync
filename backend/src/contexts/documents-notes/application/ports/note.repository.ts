import type { Prisma } from "@prisma/client";

type NoteWithRelations = Prisma.notesGetPayload<{
  include: {
    users: {
      select: {
        user_id: true;
        email: true;
        username: true;
        firstname: true;
        lastname: true;
      };
    };
    subjects: { select: { subject_id: true; name: true; short_name: true } };
    priorities: { select: { priority_id: true; name: true } };
  };
}>;
type NoteRecord = Prisma.notesGetPayload<object>;
/** A note read with or without its relations (`includeRelations`). */
export type NoteRow = NoteRecord &
  Partial<Omit<NoteWithRelations, keyof NoteRecord>>;

export type NoteData = Omit<
  Prisma.notesUncheckedCreateInput,
  "note_id" | "created_by" | "created_at"
>;

/** Personal notes (port); the queries NotesService made before M19. */
export abstract class NoteRepository {
  abstract subjectExists(subjectId: number): Promise<boolean>;
  abstract findPriorityIdByNames(names: string[]): Promise<number | null>;
  abstract create(
    data: NoteData,
    userId: number,
    includeRelations: boolean,
  ): Promise<NoteRow>;
  abstract findAllOf(
    userId: number,
    subjectId: number | undefined,
    includeRelations: boolean,
  ): Promise<NoteRow[]>;
  abstract findOwn(
    noteId: number,
    userId: number,
    includeRelations: boolean,
  ): Promise<NoteRow | null>;
  abstract update(
    noteId: number,
    data: Partial<NoteData>,
    includeRelations: boolean,
  ): Promise<NoteRow>;
  abstract delete(noteId: number): Promise<void>;
}
