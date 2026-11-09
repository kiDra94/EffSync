import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SecretCipher } from "../../application/ports/secret-cipher";

const VERSION = "v1";
const TAG_BYTES = 16;

/**
 * AES-256-GCM with TWO_FACTOR_ENCRYPTION_KEY (decision Q8d, M32), which
 * config validation requires as 32 bytes in hex. Stored as
 * "v1:<iv>:<auth tag>:<ciphertext>" in base64; the tag makes a changed value
 * fail instead of decrypting to garbage.
 */
@Injectable()
export class AesGcmSecretCipher extends SecretCipher {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    super();
    this.key = Buffer.from(
      config.getOrThrow<string>("TWO_FACTOR_ENCRYPTION_KEY"),
      "hex",
    );
  }

  encrypt(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv, {
      authTagLength: TAG_BYTES,
    });
    const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    return [VERSION, iv, cipher.getAuthTag(), data]
      .map((part) =>
        typeof part === "string" ? part : part.toString("base64"),
      )
      .join(":");
  }

  decrypt(stored: string): string {
    const [version, iv, tag, data] = stored.split(":");
    if (version !== VERSION || !iv || !tag || !data) {
      throw new Error("Not an encrypted 2FA secret");
    }
    const authTag = Buffer.from(tag, "base64");
    // GCM would take a shorter tag; only the full 16 bytes are ours (review M32)
    if (authTag.length !== TAG_BYTES) {
      throw new Error("Not an encrypted 2FA secret");
    }
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.key,
      Buffer.from(iv, "base64"),
      { authTagLength: TAG_BYTES },
    );
    decipher.setAuthTag(authTag);
    return Buffer.concat([
      decipher.update(Buffer.from(data, "base64")),
      decipher.final(),
    ]).toString("utf8");
  }
}
