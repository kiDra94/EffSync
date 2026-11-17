import { IsNotEmpty, IsString, MaxLength } from "class-validator";

/** Body of POST/PATCH /tasks/:id/comments (decision Q16). */
export class CommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;
}
