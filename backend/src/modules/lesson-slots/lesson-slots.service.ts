import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateLessonSlotDto } from "./dto/create-lesson-slot.dto";
import { UpdateLessonSlotDto } from "./dto/update-lesson-slots.dto";

@Injectable()
export class LessonSlotService {
  // Datenbank-Service laden
  constructor(private prisma: PrismaService) {}

  create(createLessonSlotDto: CreateLessonSlotDto) {
    return this.prisma.lesson_slots.create({
      data: createLessonSlotDto,
    });
  }

  findAll() {
    return this.prisma.lesson_slots.findMany();
  }

  findOne(id: number) {
  return this.prisma.lesson_slots.findUnique({
    // 👇 Statt 'id' wahrscheinlich 'lesson_slot_id'
    where: { slot_id: id }, 
  });
}

 update(id: number, updateLessonSlotDto: UpdateLessonSlotDto) {
  return this.prisma.lesson_slots.update({
    // 👇 Auch hier anpassen
    where: { slot_id: id },
    data: updateLessonSlotDto,
  });
}

  remove(id: number) {
    return this.prisma.lesson_slots.delete({
      where: { slot_id: id },
    });
  }
}