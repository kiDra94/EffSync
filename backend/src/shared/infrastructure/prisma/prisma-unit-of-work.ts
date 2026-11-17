import { AsyncLocalStorage } from "node:async_hooks";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { UnitOfWork } from "../../application/unit-of-work";
import { Transaction } from "../../domain/transaction";
import { PrismaService } from "./prisma.service";

@Injectable()
export class PrismaUnitOfWork extends UnitOfWork {
  // the transaction of the current use case, per async call chain
  private readonly current = new AsyncLocalStorage<Prisma.TransactionClient>();

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  run<T>(work: (transaction: Transaction) => Promise<T>): Promise<T> {
    const open = this.current.getStore();
    if (open) {
      // nested use case: join the open transaction instead of a second one
      return work(open as unknown as Transaction);
    }
    return this.prisma.$transaction((client) =>
      this.current.run(client, () => work(client as unknown as Transaction)),
    );
  }

  /** For repositories: the open transaction, or the plain client outside one. */
  client(): Prisma.TransactionClient {
    return this.current.getStore() ?? this.prisma;
  }
}
