import { authenticator } from "otplib";
import { OtplibTotp } from "./otplib-totp";

// RFC 6238 through otplib (M32): 6 digits, 30 s, one step of drift
describe("OtplibTotp", () => {
  const totp = new OtplibTotp();
  const now = new Date("2026-11-09T10:00:15Z");
  const step = Math.floor(now.getTime() / 30_000);
  const codeAt = (secret: string, offsetSteps: number) =>
    authenticator
      .clone({ epoch: now.getTime() + offsetSteps * 30_000 })
      .generate(secret);

  it("makes a base32 secret of 160 bits and an otpauth URL with its QR code", async () => {
    const secret = totp.generateSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);

    const { otpauthUrl, qrCode } = await totp.provisioning(secret, "ffuchs");
    expect(otpauthUrl).toBe(
      `otpauth://totp/EffSync:ffuchs?secret=${secret}&period=30&digits=6&algorithm=SHA1&issuer=EffSync`,
    );
    expect(qrCode).toMatch(/^data:image\/png;base64,/);
  });

  it("tells the time step of a valid code, one step of drift either way", () => {
    const secret = totp.generateSecret();

    expect(totp.matchStep(codeAt(secret, 0), secret, now)).toBe(step);
    expect(totp.matchStep(codeAt(secret, -1), secret, now)).toBe(step - 1);
    expect(totp.matchStep(codeAt(secret, 1), secret, now)).toBe(step + 1);
    expect(totp.matchStep(codeAt(secret, 2), secret, now)).toBeNull();
  });

  it("refuses a wrong code and anything but six digits", () => {
    const secret = totp.generateSecret();
    const right = codeAt(secret, 0);
    const wrong = String((Number(right) + 1) % 1_000_000).padStart(6, "0");

    expect(totp.matchStep(wrong, secret, now)).toBeNull();
    expect(totp.matchStep("12345", secret, now)).toBeNull();
    expect(totp.matchStep("abcdef", secret, now)).toBeNull();
  });
});
