import { IsOptional, IsString, MaxLength } from "class-validator";

export class GradeDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  grade?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  feedback?: string;
}
