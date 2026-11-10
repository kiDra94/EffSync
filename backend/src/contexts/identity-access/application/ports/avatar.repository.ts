/** The users' profile pictures (table user_avatars, decision Q8c; Prisma in infrastructure). */
export abstract class AvatarRepository {
  abstract find(
    userId: number,
  ): Promise<{ mime_type: string; data: Uint8Array } | null>;
  /** The change time, without loading the image; null without one. */
  abstract findVersion(userId: number): Promise<Date | null>;
  /** Stores or replaces the picture and returns its change time. */
  abstract save(userId: number, mimeType: string, data: Buffer): Promise<Date>;
  abstract remove(userId: number): Promise<void>;
}
