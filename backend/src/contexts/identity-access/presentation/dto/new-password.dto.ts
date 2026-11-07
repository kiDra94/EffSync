import { IsString, MaxLength, MinLength } from "class-validator";

/** Body of POST /auth/set-new-password: the same rules as on registration. */
export class NewPasswordDto {
  @IsString()
  @MinLength(7, {
    message: "Das Passwort muss mindestens 7 Zeichen lang sein.",
  })
  @MaxLength(32, { message: "Das Passwort soll maximal 32 Zeichen lang sein." })
  password: string;
}
