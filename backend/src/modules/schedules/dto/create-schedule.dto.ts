import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsDateString,
} from "class-validator";

export class CreateScheduleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsDateString()
  @IsOptional()
  valid_from?: string;

  @IsDateString()
  @IsOptional()
  valid_to?: string;
}
