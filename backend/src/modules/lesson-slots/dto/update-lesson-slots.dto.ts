import { PartialType } from "@nestjs/mapped-types";
import { CreateLessonSlotDto } from "./create-lesson-slots.dto";

export class UpdateLessonSlotDto extends PartialType(CreateLessonSlotDto) {}
