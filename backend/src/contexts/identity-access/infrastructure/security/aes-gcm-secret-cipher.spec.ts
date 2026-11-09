import type { ConfigService } from "@nestjs/config";
import { AesGcmSecretCipher } from "./aes-gcm-secret-cipher";

// decision Q8d (M32): the TOTP secrets are encrypted at rest
describe("AesGcmSecretCipher", () => {
  const configWith = (key: string) =>
    ({ getOrThrow: () => key }) as unknown as ConfigService;
  const cipher = new AesGcmSecretCipher(configWith("ab".repeat(32)));

  it("encrypts to something that isn't the secret and decrypts it back", () => {
    const stored = cipher.encrypt("JBSWY3DPEHPK3PXP");

    expect(stored).toMatch(/^v1:/);
    expect(stored).not.toContain("JBSWY3DPEHPK3PXP");
    expect(cipher.decrypt(stored)).toBe("JBSWY3DPEHPK3PXP");
  });

  it("uses a new IV each time", () => {
    expect(cipher.encrypt("same")).not.toBe(cipher.encrypt("same"));
  });

  it("refuses a tampered value and another key", () => {
    const stored = cipher.encrypt("JBSWY3DPEHPK3PXP");
    const [version, iv, tag, data] = stored.split(":");
    const flipped = Buffer.from(data, "base64");
    flipped[0] ^= 1;

    expect(() =>
      cipher.decrypt([version, iv, tag, flipped.toString("base64")].join(":")),
    ).toThrow();
    expect(() =>
      new AesGcmSecretCipher(configWith("cd".repeat(32))).decrypt(stored),
    ).toThrow();
    expect(() => cipher.decrypt("plain")).toThrow();
  });

  // review M32: a cut tag would make forging cheaper
  it("refuses a tag shorter than 16 bytes", () => {
    const [version, iv, tag, data] = cipher
      .encrypt("JBSWY3DPEHPK3PXP")
      .split(":");
    const short = Buffer.from(tag, "base64").subarray(0, 4).toString("base64");

    expect(() =>
      cipher.decrypt([version, iv, short, data].join(":")),
    ).toThrow();
  });
});
