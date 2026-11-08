import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

/** A template is a name and a description (decision H2, M18). */
export class CreateTaskTemplateDto {
  @ApiProperty({ example: "Hausübung" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: "Kapitel lesen und die Aufgaben lösen" })
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;
}
