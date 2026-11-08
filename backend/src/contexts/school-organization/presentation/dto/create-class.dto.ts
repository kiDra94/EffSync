import { IsInt, IsNotEmpty, IsString, IsOptional } from "class-validator";

export class CreateClassDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  @IsOptional()
  department_id?: number;

  @IsInt()
  @IsOptional()
  head_teacher_id?: number;

  @IsInt()
  @IsOptional()
  schedule_id?: number;
}
