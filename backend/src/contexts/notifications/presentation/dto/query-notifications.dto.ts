import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, Max, Min } from "class-validator";

/** GET /notifications: the read filter and the page (M37). */
export class QueryNotificationsDto {
  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  // as before: "true" is read, any other value unread, none no filter
  @Transform(({ value }: { value: unknown }) =>
    value === undefined ? undefined : value === "true" || value === true,
  )
  @IsBoolean()
  is_read?: boolean;

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
