import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { SessionService } from "../application/session.service";

/**
 * Removes expired refresh tokens once a night, so `refresh_tokens` stays
 * bounded (M12). The cron scheduler is registered by `ScheduleModule.forRoot()`
 * in AppModule; it runs every `@Cron` in the app.
 */
@Injectable()
export class SessionCleanupJob {
  private readonly logger = new Logger(SessionCleanupJob.name);

  constructor(private readonly sessions: SessionService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async run(): Promise<void> {
    const deleted = await this.sessions.deleteExpired();
    this.logger.log(`${deleted} abgelaufene Sitzungen gelöscht`);
  }
}
