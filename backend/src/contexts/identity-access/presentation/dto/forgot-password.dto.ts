import { IsEmail, MaxLength } from "class-validator";

/** Body of POST /auth/forgot-password (T52). */
export class ForgotPasswordDto {
  @IsEmail()
  @MaxLength(255)
  email: string;
}
