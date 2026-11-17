import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

/** Query of the admin audit log GET /tasks/activity (T33, decision A2). */
export class AuditLogQueryDto {
  @ApiPropertyOptional({ description: "only entries of this user" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  user_id?: number;

  @ApiPropertyOptional({ description: "part of the action text" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  action?: string;

  @ApiPropertyOptional({ description: "from this time (ISO 8601)" })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({
    description:
      "until this time (ISO 8601); a date alone means the end of that day",
  })
  @IsOptional()
  // reads the raw query value: @Type would already have made it midnight
  @Transform(({ obj }: { obj: { to?: unknown } }) => {
    if (typeof obj.to !== "string") return obj.to;
    return /^\d{4}-\d{2}-\d{2}$/.test(obj.to)
      ? new Date(`${obj.to}T23:59:59.999Z`)
      : new Date(obj.to);
  })
  @IsDate()
  to?: Date;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
