import { Injectable } from "@nestjs/common";
import { PrismaUnitOfWork } from "../../../../shared/infrastructure/prisma/prisma-unit-of-work";
import {
  EmailLogRepository,
  EmailPreferenceRepository,
} from "../../application/ports/email.repository";
import type {
  EmailLogEntry,
  EmailPreferenceChanges,
} from "../../application/ports/notification-records";

/** email_logs on Prisma (M23, from EmailService). */
@Injectable()
export class PrismaEmailLogRepository extends EmailLogRepository {
  constructor(private readonly unitOfWork: PrismaUnitOfWork) {
    super();
  }

  async log(entry: EmailLogEntry) {
    await this.unitOfWork.client().email_logs.create({
      data: {
        ...entry,
        sent_at: entry.status === "sent" ? new Date() : null,
      },
    });
  }

  async sentSince(userId: number, emailType: string, since: Date) {
    return !!(await this.unitOfWork.client().email_logs.findFirst({
      where: {
        user_id: userId,
        email_type: emailType,
        status: "sent",
        sent_at: { gte: since },
      },
    }));
  }
}

/** email_preferences on Prisma (M23, from EmailPreferencesController). */
@Injectable()
export class PrismaEmailPreferenceRepository extends EmailPreferenceRepository {
  constructor(private readonly unitOfWork: PrismaUnitOfWork) {
    super();
  }

  private get db() {
    return this.unitOfWork.client();
  }

  find(userId: number) {
    return this.db.email_preferences.findUnique({ where: { user_id: userId } });
  }

  upsert(userId: number, changes: EmailPreferenceChanges) {
    return this.db.email_preferences.upsert({
      where: { user_id: userId },
      create: { user_id: userId, ...changes },
      update: changes,
    });
  }
}
