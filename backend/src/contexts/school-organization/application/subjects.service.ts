import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { SubjectRepository } from "./ports/school-catalog.repository";
import type { SubjectInput } from "./school-inputs";

/** Subjects (T26, M36): managed with manage_classes, read by everyone. */
@Injectable()
export class SubjectsService {
  constructor(private readonly subjects: SubjectRepository) {}

  create(input: SubjectInput & { name: string }) {
    return this.subjects.create(input);
  }

  findAll() {
    return this.subjects.findAll();
  }

  async findOne(id: number) {
    const found = await this.subjects.findById(id);
    if (!found) throw new NotFoundException(`Fach ${id} nicht gefunden`);
    return found;
  }

  async update(id: number, input: SubjectInput) {
    await this.findOne(id);
    return this.subjects.update(id, input);
  }

  async remove(id: number) {
    await this.findOne(id);
    if (!(await this.subjects.delete(id))) {
      throw new ConflictException(
        `Fach ${id} wird noch verwendet (von Unterrichtsstunden oder Notizen)`,
      );
    }
    return { message: "Fach gelöscht", subject_id: id };
  }
}
