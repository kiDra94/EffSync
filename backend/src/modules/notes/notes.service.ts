import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateNoteDto } from "./dto/create-note.dto";
import { UpdateNoteDto } from "./dto/update-note.dto";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createNoteDto: CreateNoteDto, userId: number, includeRelations = true) {
    if (createNoteDto.subject_id) {
      const subject = await this.prisma.subjects.findUnique({
        where: { subject_id: createNoteDto.subject_id }
      });
      if (!subject) {
        throw new NotFoundException(`Subject with ID ${createNoteDto.subject_id} not found!`);
      };
    };

    if (createNoteDto.task_id) {
      const task = await this.prisma.tasks.findUnique({
        where: { task_id: createNoteDto.task_id }
      });
      if (!task) {
        throw new NotFoundException(`Task with ID ${createNoteDto.task_id} not found!`);
      };
    };

    const { priority, ...rest } = createNoteDto;
    const resolvedPriorityId = await this.resolvePriorityId(priority, rest.priority_id);

    const note = await this.prisma.notes.create({
      data: {
        ...rest,
        priority_id: resolvedPriorityId,
        created_by: userId
      },
      include: includeRelations ? this.basicInclude() : undefined,
    });

    return this.enrichNoteForUi(note);
  }

  async findAll(userId: number, subjectId?: number, includeRelations = true) {
    const whereClause: Record<string, any> = {
      created_by: userId,
    };

    if (typeof subjectId === 'number') {
      whereClause.subject_id = subjectId;
    }

    const notes = await this.prisma.notes.findMany({
      where: whereClause,
      include: includeRelations ? this.basicInclude() : undefined,
      orderBy: { created_at: 'desc' },
    });

    return notes.map((note) => this.enrichNoteForUi(note));
  }

  async findOne(noteId: number, userId: number, includeRelations = true) {
    const note = await this.prisma.notes.findFirst({
      where: {
        note_id: noteId,
        created_by: userId,
      },
      include: includeRelations ? this.basicInclude() : undefined,
    });

    if (!note) {
      throw new NotFoundException(`Note with ID ${noteId} not found for current user!`);
    };

    return this.enrichNoteForUi(note);
  }

  async update(noteId: number, userId: number, updateNoteDto: UpdateNoteDto, includeRelations = true) {
    await this.findOne(noteId, userId, false);

    if (updateNoteDto.subject_id) {
      const subject = await this.prisma.subjects.findUnique({
        where: { subject_id: updateNoteDto.subject_id },
      });
      if (!subject) {
        throw new NotFoundException(`Subject with ID ${updateNoteDto.subject_id} not found!`);
      }
    }

    if (updateNoteDto.task_id) {
      const task = await this.prisma.tasks.findUnique({
        where: { task_id: updateNoteDto.task_id },
      });
      if (!task) {
        throw new NotFoundException(`Task with ID ${updateNoteDto.task_id} not found!`);
      }
    }

    const { priority, ...rest } = updateNoteDto;
    const resolvedPriorityId = await this.resolvePriorityId(priority, rest.priority_id);

    const note = await this.prisma.notes.update({
      where: { note_id: noteId },
      data: {
        ...rest,
        ...(resolvedPriorityId ? { priority_id: resolvedPriorityId } : {}),
        updated_at: new Date(),
      },
      include: includeRelations ? this.basicInclude() : undefined,
    });

    return this.enrichNoteForUi(note);
  }

  async remove(noteId: number, userId: number) {
    await this.findOne(noteId, userId, false);

    await this.prisma.notes.delete({
      where: { note_id: noteId },
    });

    return { message: 'Note deleted successfully', note_id: noteId };
  }

  private basicInclude() {
    return {
      users: {
        select: {
          user_id: true,
          email: true,
          username: true,
          firstname: true, 
          lastname: true,
        },
      },
      subjects: {
        select: {
          subject_id: true,
          name: true,
          short_name: true,
        },
      },
      priorities: {
        select: {
          priority_id: true,
          name: true,
        },
      },
      tasks: {
        select: {
          task_id: true,
          title: true,
        },
      },
    };
  }

  private async resolvePriorityId(priority?: "low" | "medium" | "high", priorityId?: number) {
    if (priorityId) return priorityId;
    if (!priority) return undefined;

    const aliases: Record<"low" | "medium" | "high", string[]> = {
      low: ["Niedrig", "Sehr Niedrig", "Low"],
      medium: ["Normal", "Mittel", "Medium"],
      high: ["Hoch", "Sehr Hoch", "Wichtig", "Sehr Wichtig", "High", "Dringend", "Kritisch"],
    };

    const found = await this.prisma.priorities.findFirst({
      where: { name: { in: aliases[priority] } },
      orderBy: { priority_id: "asc" },
    });

    return found?.priority_id;
  }

  private enrichNoteForUi<T extends Record<string, any>>(note: T): T & { priority: "low" | "medium" | "high" | null } {
    const priorityName = (note as any)?.priorities?.name as string | undefined;
    const normalized = priorityName?.toLowerCase() ?? "";

    let priority: "low" | "medium" | "high" | null = null;
    if (normalized.includes("niedrig") || normalized.includes("low")) priority = "low";
    else if (normalized.includes("normal") || normalized.includes("mittel") || normalized.includes("medium")) priority = "medium";
    else if (
      normalized.includes("hoch") ||
      normalized.includes("wichtig") ||
      normalized.includes("dringend") ||
      normalized.includes("kritisch") ||
      normalized.includes("high")
    ) {
      priority = "high";
    }

    return {
      ...note,
      priority,
    };
  }
}
