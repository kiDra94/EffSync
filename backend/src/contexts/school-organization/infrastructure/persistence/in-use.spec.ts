import { Prisma } from "@prisma/client";
import { deleteUnlessReferenced } from "./in-use";

// M36: a delete that a foreign key blocks is a 409 in the use case, not a 500
describe("deleteUnlessReferenced", () => {
  const prismaError = (code: string) =>
    new Prisma.PrismaClientKnownRequestError("x", {
      code,
      clientVersion: "7",
    });

  it("is true after the delete", async () => {
    await expect(deleteUnlessReferenced(() => Promise.resolve())).resolves.toBe(
      true,
    );
  });

  it("is false when a foreign key still refers to the row", async () => {
    await expect(
      deleteUnlessReferenced(() => Promise.reject(prismaError("P2003"))),
    ).resolves.toBe(false);
  });

  it("rethrows any other error", async () => {
    await expect(
      deleteUnlessReferenced(() => Promise.reject(prismaError("P2025"))),
    ).rejects.toThrow();
  });
});
