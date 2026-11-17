import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

/** Body of POST /auth/change-password (T47, M27). */
export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MaxLength(128)
  current_password: string;

  // the same rules as on registration and in NewPasswordDto
  @ApiProperty()
  @IsString()
  @MinLength(7, {
    message: "Das Passwort muss mindestens 7 Zeichen lang sein.",
  })
  @MaxLength(32, { message: "Das Passwort soll maximal 32 Zeichen lang sein." })
  new_password: string;
}
