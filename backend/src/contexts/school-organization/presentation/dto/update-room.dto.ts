import { IsNotEmpty, IsString, ValidateIf } from "class-validator";
import { PartialType } from "@nestjs/mapped-types";
import { CreateRoomDto } from "./create-room.dto";

export class UpdateRoomDto extends PartialType(CreateRoomDto) {
  // optional, but never null or empty (review M36)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  name?: string;
}
