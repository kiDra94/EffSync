/**
 * Recognizes a file's type from its content (port; magic bytes in
 * infrastructure). Shared: document uploads and avatars (M27) use it.
 */
export abstract class FileInspector {
  abstract detectMime(content: Buffer | Uint8Array): string | null;
}
