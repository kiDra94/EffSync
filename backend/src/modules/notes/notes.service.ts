import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateNoteDto } from "./dto/create-note.dto";
import { UpdateNoteDto } from "./dto/update-note.dto";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}
  async create(createNoteDto: CreateNoteDto, userId: number, includeRelations = true) {
    if(createNoteDto.subject_id) {
      const subject = await this.prisma.subjects.findUnique({
        where: { subject_id: createNoteDto.subject_id }
      });
      if(!subject) {
        throw new NotFoundException(`Subjcket with ID ${createNoteDto.subject_id} not found!`);
      };
    };
    return await this.prisma.notes.create({
      data: {
        ...CreateNoteDto,
        created_by : userId
      },
      include: includeRelations ? this.basicInclude() : undefined,
    })
  }

  async findAll(userId: number, subjectId?: number, includeRelations = true) {
    return await this.prisma.notes.findMany({
      where: {
        created_by: userId,
        subject_id: subjectId,
      },
      include: includeRelations ? this.basicInclude() : undefined,
      orderBy: { created_at : 'desc' },
    });
  }

  async findOne(noteId: number, includeRelations = true) {
    const note = await this.prisma.notes.findUnique({
      where: { note_id: noteId },
      include: includeRelations ? this.basicInclude() : undefined,
    });
    if(!note) {
      throw new NotFoundException(`Note with ID ${noteId} not found!`);
    };
    return note;
  }

  async update(noteId: number, userId: number, updateNoteDto: UpdateNoteDto, includeRelations = true) {
    const note = await this.findOne(noteId);
    if(note.created_by !== userId) {
      throw new ForbiddenException(`You can only edit your own notes`)
    }
    return this.prisma.notes.update({
      where: { note_id: noteId },
      data: {
        ...updateNoteDto,
        updated_at: new Date(),
      },
      include: includeRelations ? this.basicInclude() : undefined,
    });
  }

  async remove(noteId: number, userId: number) {
    const note = await this.findOne(noteId);
    if (note.created_by !== userId) {
      throw new ForbiddenException('You can only delete your own notes');
    }
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
          first_name: true,
          last_name: true,
        },
        subjects: {
          select: {
            subject_id: true,
            name: true,
            short_name: true,
          },
        },
      },
    };
  }
}
