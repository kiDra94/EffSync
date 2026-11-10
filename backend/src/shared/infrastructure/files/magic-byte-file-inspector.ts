import { Injectable } from "@nestjs/common";
import { FileInspector } from "../../application/file-inspector";

const startsWith = (bytes: Buffer, signature: number[], offset = 0) =>
  bytes.length >= offset + signature.length &&
  signature.every((byte, i) => bytes[offset + i] === byte);

/** Recognizes the common file types by their first bytes (magic bytes). */
@Injectable()
export class MagicByteFileInspector extends FileInspector {
  detectMime(content: Buffer | Uint8Array): string | null {
    const bytes = Buffer.isBuffer(content) ? content : Buffer.from(content);
    if (bytes.length < 4) return null;

    if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46])) return "application/pdf"; // %PDF
    if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
      return "image/png";
    }
    if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
    // GIF87a / GIF89a
    if (
      startsWith(bytes, [0x47, 0x49, 0x46, 0x38]) &&
      (bytes[4] === 0x37 || bytes[4] === 0x39) &&
      bytes[5] === 0x61
    ) {
      return "image/gif";
    }
    // RIFF....WEBP
    if (
      startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
      startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
    ) {
      return "image/webp";
    }
    if (startsWith(bytes, [0x42, 0x4d])) return "image/bmp";
    return null;
  }
}
