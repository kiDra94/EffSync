import { IsString, IsNotEmpty, IsInt } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateTaskActivityLogDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsNotEmpty()
  task_id: number;

  @ApiProperty({ example: "status_changed" })
  @IsString()
  @IsNotEmpty()
  action: string;
}
