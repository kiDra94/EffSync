import {
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
  @IsDateString() @IsOptional() deadline?: string;
  @IsInt() @IsNotEmpty() created_by: number;
  @IsInt() @IsOptional() assigned_to?: number;
  @IsInt() @IsOptional() parent_task_id?: number;
  @IsInt() @IsOptional() priority_id?: number;
}
