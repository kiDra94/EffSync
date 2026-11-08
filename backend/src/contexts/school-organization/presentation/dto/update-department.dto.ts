import { IsNotEmpty, IsString, ValidateIf } from "class-validator";
import { PartialType } from "@nestjs/mapped-types";
import { CreateDepartmentDto } from "./create-department.dto";

export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {
  // optional, but never null or empty (review M36)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  name?: string;
}
