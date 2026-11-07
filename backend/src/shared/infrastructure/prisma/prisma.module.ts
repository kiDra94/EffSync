import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { PrismaUnitOfWork } from "./prisma-unit-of-work";
import { UnitOfWork } from "../../application/unit-of-work";

@Module({
  providers: [
    PrismaService,
    // the transaction boundary for use cases (L1); contexts inject UnitOfWork
    { provide: UnitOfWork, useClass: PrismaUnitOfWork },
  ],
  exports: [PrismaService, UnitOfWork],
})
export class PrismaModule {}
