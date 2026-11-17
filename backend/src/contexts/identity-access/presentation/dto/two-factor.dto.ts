import { ApiProperty } from "@nestjs/swagger";
import { IsJWT, Matches } from "class-validator";

/** The 6-digit code of the authenticator app (M32). */
export class TwoFactorCodeDto {
  @ApiProperty({ example: "123456" })
  @Matches(/^\d{6}$/, { message: "Der Code hat 6 Ziffern" })
  code: string;
}

/** The login's second step (UC-01b): the challenge from /auth/login and the code. */
export class VerifyTwoFactorDto extends TwoFactorCodeDto {
  @ApiProperty()
  @IsJWT()
  challenge_token: string;
}
