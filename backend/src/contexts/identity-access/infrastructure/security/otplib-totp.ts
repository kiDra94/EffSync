import { Injectable } from "@nestjs/common";
import { authenticator } from "otplib";
import { toDataURL } from "qrcode";
import { Totp } from "../../application/ports/totp";

const ISSUER = "EffSync";
const STEP_SECONDS = 30;

/** TOTP with otplib (RFC 6238; Google Authenticator and others, FA-06). */
@Injectable()
export class OtplibTotp extends Totp {
  // 6 digits, 30-second steps, one step of clock drift either way
  private readonly options = { digits: 6, step: STEP_SECONDS, window: 1 };

  generateSecret(): string {
    // 20 bytes, the 160 bits RFC 4226 recommends
    return authenticator.generateSecret(20);
  }

  async provisioning(secret: string, accountName: string) {
    const otpauthUrl = authenticator
      .clone(this.options)
      .keyuri(accountName, ISSUER, secret);
    return { otpauthUrl, qrCode: await toDataURL(otpauthUrl) };
  }

  matchStep(code: string, secret: string, now: Date): number | null {
    if (!/^\d{6}$/.test(code)) return null;
    const delta = authenticator
      .clone({ ...this.options, epoch: now.getTime() })
      .checkDelta(code, secret);
    return delta === null
      ? null
      : Math.floor(now.getTime() / 1000 / STEP_SECONDS) + delta;
  }
}
