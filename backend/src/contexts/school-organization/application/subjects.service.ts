import { Injectable } from "@nestjs/common";
import type { SubjectInput } from "./school-inputs";

// a stub until M36 (school organization on the real API)
@Injectable()
export class SubjectsService {
  create(createSubjectDto: SubjectInput) {
    return "This action adds a new subject";
  }

  findAll() {
    return `This action returns all subjects`;
  }

  findOne(id: number) {
    return `This action returns a #${id} subject`;
  }

  update(id: number, updateSubjectDto: SubjectInput) {
    return `This action updates a #${id} subject`;
  }

  remove(id: number) {
    return `This action removes a #${id} subject`;
  }
}
