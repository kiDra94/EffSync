import { IsDateString, IsOptional } from "class-validator";

export class AllowResubmitDto {
  /** the new deadline (ISO date); without it the deadline stays */
  @IsOptional()
  @IsDateString()
  new_deadline?: string;
}
