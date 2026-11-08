import { Injectable } from "@nestjs/common";
import type { ClassInput } from "./school-inputs";

// a stub until M36 (school organization on the real API)
@Injectable()
export class ClassesService {
  create(createClassDto: ClassInput) {
    return "This action adds a new class";
  }

  findAll() {
    return `This action returns all classes`;
  }

  findOne(id: number) {
    return `This action returns a #${id} class`;
  }

  update(id: number, updateClassDto: ClassInput) {
    return `This action updates a #${id} class`;
  }

  remove(id: number) {
    return `This action removes a #${id} class`;
  }
}
