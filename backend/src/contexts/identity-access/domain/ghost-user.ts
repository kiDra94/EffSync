/**
 * The ghost user (T10, 03_…:295-299): deleted accounts' shared content is
 * reassigned to it, so chat histories and tasks stay intact. user_id 0 is
 * below PostgreSQL's autoincrement start, so the seed (and a data migration
 * for existing databases) creates it explicitly. It has no password and no
 * Google id, so nobody can sign in as it.
 */
export const GHOST_USER_ID = 0;

export const GHOST_USER = {
  user_id: GHOST_USER_ID,
  firstname: "Gelöschter",
  lastname: "Nutzer",
  username: "geloeschter-nutzer",
  email: "ghost@effsync.invalid",
} as const;
