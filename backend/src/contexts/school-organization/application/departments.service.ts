import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DepartmentRepository } from "./ports/school-catalog.repository";
import type { DepartmentInput } from "./school-inputs";

/** Departments (T26, M36): managed with manage_classes, read by everyone. */
@Injectable()
export class DepartmentsService {
  constructor(private readonly departments: DepartmentRepository) {}

  create(input: DepartmentInput & { name: string }) {
    return this.departments.create(input);
  }

  findAll() {
    return this.departments.findAll();
  }

  async findOne(id: number) {
    const found = await this.departments.findById(id);
    if (!found) throw new NotFoundException(`Abteilung ${id} nicht gefunden`);
    return found;
  }

  async update(id: number, input: DepartmentInput) {
    await this.findOne(id);
    return this.departments.update(id, input);
  }

  async remove(id: number) {
    await this.findOne(id);
    if (!(await this.departments.delete(id))) {
      throw new ConflictException(
        `Abteilung ${id} wird noch verwendet (von Klassen)`,
      );
    }
    return { message: "Abteilung gelöscht", department_id: id };
  }
}
