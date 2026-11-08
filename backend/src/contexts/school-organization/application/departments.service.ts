import { Injectable } from "@nestjs/common";
import type { DepartmentInput } from "./school-inputs";

// a stub until M36 (school organization on the real API)
@Injectable()
export class DepartmentsService {
  create(createDepartmentDto: DepartmentInput) {
    return "This action adds a new department";
  }

  findAll() {
    return `This action returns all departments`;
  }

  findOne(id: number) {
    return `This action returns a #${id} department`;
  }

  update(id: number, updateDepartmentDto: DepartmentInput) {
    return `This action updates a #${id} department`;
  }

  remove(id: number) {
    return `This action removes a #${id} department`;
  }
}
