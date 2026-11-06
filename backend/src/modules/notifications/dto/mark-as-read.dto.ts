import { IsBoolean } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class MarkAsReadDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  is_read: boolean;
}
