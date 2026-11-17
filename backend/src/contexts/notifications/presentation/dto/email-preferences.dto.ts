import { IsBoolean, IsIn, IsOptional } from "class-validator";

/** The e-mail preferences a user changes (T46). */
export class EmailPreferencesDto {
  @IsOptional()
  @IsBoolean()
  email_on_deadline?: boolean;

  @IsOptional()
  @IsBoolean()
  email_on_mention?: boolean;

  @IsOptional()
  @IsBoolean()
  email_on_comment?: boolean;

  @IsOptional()
  @IsBoolean()
  email_digest?: boolean;

  @IsOptional()
  @IsIn(["daily", "weekly", "monthly"])
  digest_frequency?: "daily" | "weekly" | "monthly";
}
