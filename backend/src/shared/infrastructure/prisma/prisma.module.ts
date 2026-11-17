import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { PrismaUnitOfWork } from "./prisma-unit-of-work";
import { UnitOfWork } from "../../application/unit-of-work";

@Module({
  providers: [
    PrismaService,
    // the transaction boundary for use cases (L1); contexts inject UnitOfWork,
    // their Prisma repositories PrismaUnitOfWork (for the open transaction)
    PrismaUnitOfWork,
    { provide: UnitOfWork, useExisting: PrismaUnitOfWork },
  ],
  exports: [PrismaService, UnitOfWork, PrismaUnitOfWork],
})
export class PrismaModule {}
