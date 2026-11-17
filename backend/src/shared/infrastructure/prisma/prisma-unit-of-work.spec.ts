import { PrismaUnitOfWork } from "./prisma-unit-of-work";
import { PrismaService } from "./prisma.service";
import { prismaTransaction } from "./prisma-transaction";

// L1 (M10): one unit of work per use case, implemented with prisma.$transaction
describe("PrismaUnitOfWork", () => {
  const tx = { tasks: {}, task_activity_log: {} };
  const prisma = {
    $transaction: jest.fn((work: (client: unknown) => Promise<unknown>) =>
      work(tx),
    ),
  };
  const unitOfWork = new PrismaUnitOfWork(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it("runs the work in one prisma transaction and returns its result", async () => {
    const result = await unitOfWork.run((transaction) =>
      Promise.resolve(prismaTransaction(transaction) === (tx as never)),
    );

    expect(result).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("propagates a failure out of $transaction (which makes prisma roll back)", async () => {
    await expect(
      unitOfWork.run(() => Promise.reject(new Error("activity log failed"))),
    ).rejects.toThrow("activity log failed");
  });

  // M10 review: a use case calling another context's use case shares one transaction
  it("joins the open transaction in a nested run instead of opening a second one", async () => {
    const seen: unknown[] = [];

    await unitOfWork.run(async (outer) => {
      seen.push(outer);
      await unitOfWork.run((inner) => {
        seen.push(inner);
        return Promise.resolve();
      });
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(seen[0]).toBe(seen[1]);
  });

  it("gives repositories the open transaction, or the plain client outside one", async () => {
    expect(unitOfWork.client()).toBe(prisma);

    await unitOfWork.run(() => {
      expect(unitOfWork.client()).toBe(tx);
      return Promise.resolve();
    });
  });
});
