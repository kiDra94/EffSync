import { IsNotEmpty, IsString, MaxLength } from "class-validator";

/** Body of POST /tasks/:id/grade-remarks (decision Q16). */
export class GradeRemarkDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  text: string;
}
