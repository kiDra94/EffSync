import { Transaction } from "../domain/transaction";

/**
 * Transaction boundary of a use case (L1, GOALS.md "One transaction per task
 * use case"): everything the work does commits together or not at all.
 * A nested run() - e.g. a use case calling another context's use case - joins
 * the transaction that is already open. Implemented by PrismaUnitOfWork.
 */
export abstract class UnitOfWork {
  abstract run<T>(work: (transaction: Transaction) => Promise<T>): Promise<T>;
}
