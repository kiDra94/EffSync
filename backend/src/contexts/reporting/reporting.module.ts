import { Module } from "@nestjs/common";
import { PrismaModule } from "../../shared/infrastructure/prisma/prisma.module";
import { ReportingRepository } from "./application/ports/reporting.repository";
import { ReportingService } from "./application/reporting.service";
import { PrismaReportingRepository } from "./infrastructure/persistence/prisma-reporting.repository";
import { MetricsController } from "./presentation/metrics.controller";

/** reporting (GOALS.md M24): the read-only dashboard metrics. */
@Module({
  imports: [PrismaModule],
  controllers: [MetricsController],
  providers: [
    ReportingService,
    { provide: ReportingRepository, useClass: PrismaReportingRepository },
  ],
})
export class ReportingModule {}
