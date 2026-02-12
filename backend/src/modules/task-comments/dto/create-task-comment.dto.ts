import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateTaskCommentDto {
  @IsInt()
  @IsNotEmpty()
  task_id: number;

  @IsInt()
  @IsNotEmpty()
  user_id: number; // In einer echten App nimmst du die ID oft aus dem JWT-Token

  @IsString()
  @IsNotEmpty()
  text: string;
}