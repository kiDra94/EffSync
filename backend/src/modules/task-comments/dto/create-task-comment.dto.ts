import { IsInt, IsNotEmpty, IsString } from "class-validator";

export class CreateTaskCommentDto {
  @IsInt()
  @IsNotEmpty()
  task_id: number;

  @IsInt()
  @IsNotEmpty()
  user_id: number; // A real app usually takes this ID from the JWT

  @IsString()
  @IsNotEmpty()
  text: string;
}
