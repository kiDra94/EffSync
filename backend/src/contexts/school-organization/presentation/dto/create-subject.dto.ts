import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateSubjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  short_name?: string;
}
