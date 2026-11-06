import { IsInt, IsNotEmpty, IsString, IsOptional } from "class-validator";

export class CreateCommentDto {
  @IsInt()
  @IsNotEmpty()
  task_id!: number;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsInt()
  @IsOptional()
  created_by?: number;
}
