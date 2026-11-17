/**
 * Which uploads are accepted (M19): the allowed extensions, the MIME types
 * their content must have, and a safe stored file name. Pure rules; the
 * magic-byte detection is in infrastructure.
 */
export const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".bmp",
  ".webp",
  ".doc",
  ".docx",
  ".odt",
  ".rtf",
  ".txt",
  ".md",
  ".csv",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".ods",
  ".odp",
]);

const EXPECTED_MIME_BY_EXTENSION: Record<string, string[]> = {
  ".pdf": ["application/pdf"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
  ".gif": ["image/gif"],
  ".bmp": ["image/bmp"],
  ".webp": ["image/webp"],
  ".doc": ["application/msword"],
  ".docx": [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  ".odt": ["application/vnd.oasis.opendocument.text"],
  ".rtf": ["application/rtf", "text/rtf"],
  ".txt": ["text/plain"],
  ".md": ["text/markdown", "text/plain"],
  ".csv": ["text/csv", "application/csv"],
  ".xls": ["application/vnd.ms-excel"],
  ".xlsx": [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  ".ppt": ["application/vnd.ms-powerpoint"],
  ".pptx": [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
  ".ods": ["application/vnd.oasis.opendocument.spreadsheet"],
  ".odp": ["application/vnd.oasis.opendocument.presentation"],
};

/** The last path part, like path.basename on POSIX (no Node import in domain). */
function baseName(fileName: string): string {
  const parts = fileName.replace(/\/+$/, "").split("/");
  return parts[parts.length - 1] ?? "";
}

/** The lower-case extension with its dot, like path.extname. */
export function extensionOf(fileName: string): string {
  const name = baseName(fileName);
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot).toLowerCase() : "";
}

/** Whether detected content contradicts the extension. */
export function contentContradictsExtension(
  extension: string,
  detectedMime: string | null,
): boolean {
  const expected = EXPECTED_MIME_BY_EXTENSION[extension] ?? [];
  return (
    Boolean(detectedMime) &&
    expected.length > 0 &&
    !expected.includes(String(detectedMime).toLowerCase())
  );
}

/** A file name without path parts or control and special characters. */
export function sanitizeFileName(fileName: string): string {
  const safeName = baseName(fileName || "upload.bin")
    .trim()
    // strips control characters from uploaded file names on purpose
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1F\x7F]/g, "")
    .replace(/[^a-zA-Z0-9._\- ]+/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return safeName || "upload.bin";
}
