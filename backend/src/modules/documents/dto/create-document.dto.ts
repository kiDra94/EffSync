import { IsInt, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateDocumentDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() file_path: string;
  @IsInt() @IsOptional() file_size?: number;
  @IsString() @IsOptional() mime_type?: string;
  @IsInt() @IsNotEmpty() added_by: number;
}