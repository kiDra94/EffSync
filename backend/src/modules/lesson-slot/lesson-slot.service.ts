import { Injectable } from "@nestjs/common";
import { CreateTaskActivityDto } from "./dto/create-lesson-slot.dto";
import { UpdateTaskActivityDto } from "./dto/update-lesson-slot.dto";

@Injectable()
export class TaskActivityService {
  create(createTaskActivityDto: CreateTaskActivityDto) {
    return "This action adds a new taskActivity";
  }

  findAll() {
    return `This action returns all taskActivity`;
  }

  findOne(id: number) {
    return `This action returns a #${id} taskActivity`;
  }

  update(id: number, updateTaskActivityDto: UpdateTaskActivityDto) {
    return `This action updates a #${id} taskActivity`;
  }

  remove(id: number) {
    return `This action removes a #${id} taskActivity`;
  }
}
