import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

export class LoginDto {
  @IsString()
  @MinLength(8, {
    message: "Der Username muss mindestens 8 Zeichen lang sein.",
  })
  @MaxLength(32, { message: "Der Username soll maximal 32 Zeichen lang sein." })
  username: string;

  @IsString()
  @MinLength(8, {
    message: "Das Passwort muss mindestens 8 Zeichen lang sein.",
  })
  @MaxLength(32, { message: "Das Passwort soll maximal 32 Zeichen lang sein." })
  password: string;
}
