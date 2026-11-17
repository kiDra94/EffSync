import { Injectable, NotFoundException } from "@nestjs/common";
import { UnitOfWork } from "../../../shared/application/unit-of-work";
import { NoteRepository, type NoteRow } from "./ports/note.repository";

type PriorityLevel = "low" | "medium" | "high";

/** What a note is created from (CreateNoteDto satisfies it). */
interface NoteInput {
  title: string;
  description: string;
  subject_id?: number;
  priority_id?: number;
  priority?: PriorityLevel;
}

const PRIORITY_ALIASES: Record<PriorityLevel, string[]> = {
  low: ["Niedrig", "Sehr Niedrig", "Low"],
  medium: ["Normal", "Mittel", "Medium"],
  high: [
    "Hoch",
    "Sehr Hoch",
    "Wichtig",
    "Sehr Wichtig",
    "High",
    "Dringend",
    "Kritisch",
  ],
};

/** A user's personal notes: only the author reads and changes them. */
@Injectable()
export class NotesService {
  constructor(
    private readonly notes: NoteRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async create(input: NoteInput, userId: number, includeRelations = true) {
    if (input.subject_id) await this.assertSubject(input.subject_id);

    const { priority, ...rest } = input;
    const priorityId = await this.resolvePriorityId(priority, rest.priority_id);
    const note = await this.notes.create(
      { ...rest, priority_id: priorityId },
      userId,
      includeRelations,
    );
    return withPriorityLevel(note);
  }

  async findAll(userId: number, subjectId?: number, includeRelations = true) {
    const notes = await this.notes.findAllOf(
      userId,
      typeof subjectId === "number" ? subjectId : undefined,
      includeRelations,
    );
    return notes.map(withPriorityLevel);
  }

  async findOne(noteId: number, userId: number, includeRelations = true) {
    const note = await this.notes.findOwn(noteId, userId, includeRelations);
    if (!note) {
      throw new NotFoundException(
        `Note with ID ${noteId} not found for current user!`,
      );
    }
    return withPriorityLevel(note);
  }

  async update(
    noteId: number,
    userId: number,
    input: Partial<NoteInput>,
    includeRelations = true,
  ) {
    await this.findOne(noteId, userId, false);
    if (input.subject_id) await this.assertSubject(input.subject_id);

    const { priority, ...rest } = input;
    const priorityId = await this.resolvePriorityId(priority, rest.priority_id);
    const note = await this.notes.update(
      noteId,
      { ...rest, ...(priorityId ? { priority_id: priorityId } : {}) },
      includeRelations,
    );
    return withPriorityLevel(note);
  }

  async remove(noteId: number, userId: number) {
    await this.findOne(noteId, userId, false);
    await this.unitOfWork.run(() => this.notes.delete(noteId));
    return { message: "Note deleted successfully", note_id: noteId };
  }

  private async assertSubject(subjectId: number) {
    if (!(await this.notes.subjectExists(subjectId))) {
      throw new NotFoundException(`Subject with ID ${subjectId} not found!`);
    }
  }

  private async resolvePriorityId(
    priority?: PriorityLevel,
    priorityId?: number,
  ) {
    if (priorityId) return priorityId;
    if (!priority) return undefined;
    return (
      (await this.notes.findPriorityIdByNames(PRIORITY_ALIASES[priority])) ??
      undefined
    );
  }
}

/** The note with its priority as low, medium or high for the UI. */
function withPriorityLevel(note: NoteRow) {
  const name = note.priorities?.name?.toLowerCase() ?? "";
  let priority: PriorityLevel | null = null;
  if (name.includes("niedrig") || name.includes("low")) priority = "low";
  else if (
    name.includes("normal") ||
    name.includes("mittel") ||
    name.includes("medium")
  )
    priority = "medium";
  else if (
    ["hoch", "wichtig", "dringend", "kritisch", "high"].some((word) =>
      name.includes(word),
    )
  )
    priority = "high";
  return { ...note, priority };
}
