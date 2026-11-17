import { IsNotEmpty, IsString, MaxLength } from "class-validator";

/** Body of POST /auth/refresh and POST /auth/logout (T51, T123). */
export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  refreshToken: string;
}
