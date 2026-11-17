import {
  ArrayMaxSize,
  IsArray,
  MaxLength,
  IsInt,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  Min,
  Max,
} from "class-validator";
import { task_status } from "@prisma/client";

export class CreateTaskDto {
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsOptional() description?: string;
  @IsEnum(task_status) @IsOptional() status?: task_status;
  @IsInt() @Min(0) @Max(100) @IsOptional() progress?: number;
  @IsString() @IsNotEmpty() deadline: string;
  @IsInt() @IsOptional() created_by?: number;
  @IsInt() @IsOptional() assigned_to?: number;
  @IsInt() @IsOptional() parent_task_id?: number;
  @IsInt() @IsOptional() priority_id?: number;
  /** the requester's template the task was created from (T110, M18) */
  @IsInt() @IsOptional() template_id?: number;
  /** tag names (T59, decision Q8e); on update they replace the task's tags */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];
}
