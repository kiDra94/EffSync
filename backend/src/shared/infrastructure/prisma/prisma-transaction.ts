import { Prisma } from "@prisma/client";
import { Transaction } from "../../domain/transaction";

/** The Prisma client behind an application-level Transaction (for repositories). */
export function prismaTransaction(
  transaction: Transaction,
): Prisma.TransactionClient {
  return transaction as unknown as Prisma.TransactionClient;
}
