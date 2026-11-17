import { Prisma } from "@prisma/client";

/**
 * Runs a delete; false if a foreign key still refers to the row (P2003),
 * so the use case can answer 409 instead of 500.
 */
export async function deleteUnlessReferenced(
  remove: () => Promise<unknown>,
): Promise<boolean> {
  try {
    await remove();
    return true;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return false;
    }
    throw error;
  }
}
