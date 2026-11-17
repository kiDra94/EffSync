import { IsString, MaxLength, MinLength } from "class-validator";

export class LoginDto {
  // username or e-mail address (T49)
  @IsString()
  @MinLength(3, {
    message: "Benutzername oder E-Mail muss mindestens 3 Zeichen lang sein.",
  })
  @MaxLength(254, {
    message: "Benutzername oder E-Mail soll maximal 254 Zeichen lang sein.",
  })
  identifier: string;

  // no length rules: a login must not reject passwords other flows accepted
  @IsString()
  @MaxLength(128)
  password: string;
}
