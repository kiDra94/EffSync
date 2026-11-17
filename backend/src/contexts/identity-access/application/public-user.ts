import type { UserRecord } from "./ports/identity-records";

/** A user row without its password hash, the shape every response uses (M11 review). */
type PublicUser = Omit<UserRecord, "password_hash">;

export function withoutPasswordHash(user: UserRecord): PublicUser {
  // the repositories always return a row; tolerate a missing one (mocked in tests)
  if (!user) return user;
  const { password_hash: _hash, ...publicUser } = user;
  return publicUser;
}
