import { IsInt, IsNotEmpty, IsOptional, IsDateString, Min, Max } from 'class-validator';

export class CreateLessonSlotDto {
  @IsInt()
  @IsNotEmpty()
  schedule_id: number;

  @IsInt()
  @IsOptional()
  subject_id?: number;

  @IsInt()
  @IsOptional()
  teacher_id?: number;

  @IsInt()
  @IsOptional()
  room_id?: number;

  @IsInt()
  @Min(1)
  @Max(7)
  day_of_week: number;

  @IsInt()
  lesson_number: number;

  @IsDateString() // Für Time-Daten in Postgres oft als ISO-String empfangen
  @IsOptional()
  start_time?: string;

  @IsDateString()
  @IsOptional()
  end_time?: string;
}