import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(7, {
    message: "Das Passwort muss mindestens 7 Zeichen lang sein.",
  })
  @MaxLength(32, { message: "Das Passwort soll maximal 32 Zeichen lang sein." })
  password: string;

  @IsString()
  @MinLength(3, { message: "Der Vorname muss mindestens 3 Zeichen lang sein." })
  firstname: string;

  @IsString()
  @MinLength(3, {
    message: "Der Nachname muss mindestens 3 Zeichen lang sein.",
  })
  lastname: string;

  @IsString()
  @MinLength(7, {
    message: "Der Username muss mindestens 7 Zeichen lang sein.",
  })
  @MaxLength(32, { message: "Der Username soll maximal 32 Zeichen lang sein." })
  username: string;
}
