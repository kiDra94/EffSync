import { ConflictException } from "@nestjs/common";
import { UserRepository } from "./ports/user.repository";

/**
 * A new account's username and e-mail must be free (M29: 409 instead of the
 * unique-constraint 500), the e-mail case-insensitively like the login.
 * Registration and the admin's user creation check it; the repository turns
 * a race past it into a 409 too.
 */
export async function assertUnused(
  users: UserRepository,
  account: { username: string; email: string },
) {
  if (await users.isTaken(account.username, account.email)) {
    throw new ConflictException(
      "Benutzername oder E-Mail-Adresse ist bereits vergeben",
    );
  }
}
