import { IsInt, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateNoteDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsNotEmpty()
  created_by: number;

  @IsInt()
  @IsOptional()
  subject_id?: number;

  @IsInt()
  @IsOptional()
  priority_id?: number;
}