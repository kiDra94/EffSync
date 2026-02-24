import { Injectable } from "@nestjs/common";
import { CreateNoteDto } from "./dto/create-note.dto";
import { UpdateNoteDto } from "./dto/update-note.dto";

@Injectable()
export class NotesService {
  create(createNoteDto: CreateNoteDto) {
    return "This action adds a new note";
  }

  findAll() {
    return `This action returns all notes`;
  }

  findOne(id: number) {
    return `This action returns a #${id} note`;
  }

  update(id: number, updateNoteDto: UpdateNoteDto) {
    return `This action updates a #${id} note`;
  }

  remove(id: number) {
    return `This action removes a #${id} note`;
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
