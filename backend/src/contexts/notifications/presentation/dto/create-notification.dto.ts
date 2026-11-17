import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
} from "class-validator";

export class CreateNotificationDto {
  @IsInt()
  @IsNotEmpty()
  user_id!: number;

  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsString()
  @IsNotEmpty()
  text!: string;

  @IsBoolean()
  @IsOptional()
  is_read?: boolean;
}
