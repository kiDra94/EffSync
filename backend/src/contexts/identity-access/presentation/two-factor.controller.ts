import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { AuthService } from "../application/auth.service";
import { SessionService } from "../application/session.service";
import { TwoFactorService } from "../application/two-factor.service";
import { TwoFactorCodeDto, VerifyTwoFactorDto } from "./dto/two-factor.dto";
import type { AuthenticatedRequest } from "./security/authenticated-request";
import { JwtAuthGuard } from "./security/jwt-auth.guard";

/**
 * Two-factor authentication (T31, FA-06, UC-01b, decision Q8d, M32): the
 * user sets it up in the profile; /auth/login then answers with a
 * challenge, and /auth/2fa/verify turns it and the code into the tokens.
 */
@ApiTags("auth")
@Controller("auth/2fa")
export class TwoFactorController {
  constructor(
    private readonly twoFactor: TwoFactorService,
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
  ) {}

  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: "Kein oder ungültiges Token" })
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Whether 2FA is on for the signed-in user" })
  @Get()
  status(@Req() req: AuthenticatedRequest) {
    return this.twoFactor.status(req.user.userId);
  }

  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: "Kein oder ungültiges Token" })
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Start the setup: a new secret with its QR code",
    description:
      "The secret stays inactive until POST /auth/2fa/enable confirms it with a code. 409 if 2FA is on.",
  })
  @Post("setup")
  setup(@Req() req: AuthenticatedRequest) {
    return this.twoFactor.setup(req.user.userId, req.user.username);
  }

  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: "Kein oder ungültiges Token" })
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Turn 2FA on with a first code from the app" })
  // review M32: as /verify, 3 a minute against guessing the code
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post("enable")
  @HttpCode(HttpStatus.NO_CONTENT)
  enable(@Req() req: AuthenticatedRequest, @Body() body: TwoFactorCodeDto) {
    return this.twoFactor.enable(req.user.userId, body.code);
  }

  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: "Kein oder ungültiges Token" })
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Turn 2FA off with a code from the app" })
  // review M32: as /verify, 3 a minute against guessing the code
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post("disable")
  @HttpCode(HttpStatus.NO_CONTENT)
  disable(@Req() req: AuthenticatedRequest, @Body() body: TwoFactorCodeDto) {
    return this.twoFactor.disable(req.user.userId, body.code);
  }

  // as the login: 3 attempts a minute (T49), against guessing the code
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiUnauthorizedResponse({
    description: "Falscher Code oder abgelaufene Anmeldung (UC-01b)",
  })
  @ApiOperation({
    summary: "The login's second step: the code for access and refresh token",
  })
  @Post("verify")
  @HttpCode(HttpStatus.OK)
  async verify(@Body() body: VerifyTwoFactorDto) {
    const userId = await this.twoFactor.verifyLogin(
      body.challenge_token,
      body.code,
    );
    return {
      ...(await this.auth.issueTokenFor(userId)),
      refreshToken: await this.sessions.start(userId),
    };
  }
}
