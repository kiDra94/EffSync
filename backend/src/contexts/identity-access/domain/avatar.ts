/** The profile picture's rules (T47, decision Q8c, M27). */
export const MAX_AVATAR_BYTES = 1024 * 1024;

// no SVG: it can carry scripts, and the magic-byte check doesn't detect it
const AVATAR_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/bmp",
]);

/** Whether the type the content shows is an accepted image. */
export const isAvatarType = (mime: string | null): mime is string =>
  mime !== null && AVATAR_TYPES.has(mime);
