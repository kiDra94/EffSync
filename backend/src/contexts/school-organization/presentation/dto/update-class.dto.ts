import { IsNotEmpty, IsString, ValidateIf } from "class-validator";
import { PartialType } from "@nestjs/mapped-types";
import { CreateClassDto } from "./create-class.dto";

export class UpdateClassDto extends PartialType(CreateClassDto) {
  // optional, but never null or empty (review M36)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  name?: string;
}
