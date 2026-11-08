/** Recognizes a file's type from its content (port; magic bytes in infrastructure). */
export abstract class FileInspector {
  abstract detectMime(content: Buffer | Uint8Array): string | null;
}
