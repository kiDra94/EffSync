import { ArrayUnique, IsArray, IsInt } from "class-validator";

/** The class's students after the change (decision D2). */
export class ReplaceClassStudentsDto {
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  student_ids!: number[];
}

/** The class's teachers after the change (decision D2). */
export class ReplaceClassTeachersDto {
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  teacher_ids!: number[];
}
