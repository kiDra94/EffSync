import { IsNotEmpty, IsString, ValidateIf } from "class-validator";
import { PartialType } from "@nestjs/swagger";
import { CreateSubjectDto } from "./create-subject.dto";

export class UpdateSubjectDto extends PartialType(CreateSubjectDto) {
  // optional, but never null or empty (review M36)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  name?: string;
}
