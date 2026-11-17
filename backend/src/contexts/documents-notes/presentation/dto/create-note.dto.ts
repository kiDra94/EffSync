import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateNoteDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsInt()
  @IsOptional()
  subject_id?: number;

  @IsInt()
  @IsOptional()
  priority_id?: number;

  @IsString()
  @IsOptional()
  @IsIn(["low", "medium", "high"])
  priority?: "low" | "medium" | "high";
}
