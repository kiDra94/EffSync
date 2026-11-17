/**
 * The avatar's change time, the one select every user query adds for
 * profile_picture (review M27: one copy for the port types and the queries).
 */
export const AVATAR_VERSION = { select: { updated_at: true } } as const;

/**
 * Where a user's profile picture is served (T47, decision Q8c, M27), relative
 * to the API's base URL like every route the frontend calls; null without
 * one. The change time as version lets the browser cache the image until it
 * is replaced.
 */
export function profilePictureUrl(
  userId: number,
  avatar: { updated_at: Date } | null | undefined,
): string | null {
  return avatar
    ? `/users/${userId}/avatar?v=${avatar.updated_at.getTime()}`
    : null;
}

/** A user row with its `user_avatars` relation as `profile_picture`. */
export function withProfilePicture<
  T extends { user_id: number; user_avatars?: { updated_at: Date } | null },
>({
  user_avatars,
  ...user
}: T): Omit<T, "user_avatars"> & { profile_picture: string | null } {
  return {
    ...user,
    profile_picture: profilePictureUrl(user.user_id, user_avatars),
  };
}
