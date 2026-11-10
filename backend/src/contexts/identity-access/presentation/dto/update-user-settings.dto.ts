import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";
import { THEMES, type Theme } from "../../domain/user-settings";

/** PATCH /users/me/settings (T68, decision Q8f, M25). */
export class UpdateUserSettingsDto {
  @ApiProperty({ enum: THEMES })
  @IsIn(THEMES)
  theme: Theme;
}
