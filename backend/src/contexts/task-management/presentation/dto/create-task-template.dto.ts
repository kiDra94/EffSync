import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { task_status } from "@prisma/client";
import { IsString, IsNotEmpty, IsOptional, IsEnum } from "class-validator";

export class CreateTaskTemplateDto {
  @ApiProperty({ example: "Hausaufgaben-Vorlage" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: "Standardvorlage für Hausaufgaben" })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: "Hausaufgabe {{fach}}" })
  @IsString()
  @IsOptional()
  default_title?: string;

  @ApiPropertyOptional({ example: "Aufgaben lösen" })
  @IsString()
  @IsOptional()
  default_description?: string;

  @ApiPropertyOptional({ enum: task_status, default: "TODO" })
  @IsEnum(task_status)
  @IsOptional()
  default_status?: task_status;
}
