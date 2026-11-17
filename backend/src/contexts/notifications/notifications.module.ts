import { Global, Module } from "@nestjs/common";
import { PasswordResetMailer } from "../identity-access/application";
import { PrismaModule } from "../../shared/infrastructure/prisma/prisma.module";
import { DeadlineMailer } from "./application/deadline-mailer";
import { DeadlineMailService } from "./application/deadline-mail.service";
import { EmailPreferencesService } from "./application/email-preferences.service";
import { EmailService } from "./application/email.service";
import { InAppNotifier } from "./application/in-app-notifier";
import { MentionMailer } from "./application/mention-mailer";
import { NotificationsService } from "./application/notifications.service";
import { Notifier } from "./application/notifier";
import { PasswordResetMail } from "./application/password-reset-mail";
import {
  EmailLogRepository,
  EmailPreferenceRepository,
} from "./application/ports/email.repository";
import { MailTransport } from "./application/ports/mail-transport";
import { NotificationRepository } from "./application/ports/notification.repository";
import { NodemailerMailTransport } from "./infrastructure/mail-transport";
import { NotificationsAccountDeletion } from "./infrastructure/notifications-account-deletion";
import {
  PrismaEmailLogRepository,
  PrismaEmailPreferenceRepository,
} from "./infrastructure/persistence/prisma-email.repository";
import { PrismaNotificationRepository } from "./infrastructure/persistence/prisma-notification.repository";
import { EmailPreferencesController } from "./presentation/email-preferences.controller";
import { NotificationsController } from "./presentation/notifications.controller";

/**
 * notifications (GOALS.md M23): in-app notifications, e-mail and the e-mail
 * preferences. Global, because the other contexts use its ports (Notifier,
 * MentionMailer, DeadlineMailer) and identity-access's PasswordResetMailer
 * is bound here; RealtimePublisher comes from the shared transport.
 */
@Global()
@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController, EmailPreferencesController],
  providers: [
    NotificationsService,
    EmailService,
    EmailPreferencesService,
    NotificationsAccountDeletion,
    { provide: Notifier, useClass: InAppNotifier },
    { provide: MentionMailer, useExisting: EmailService },
    { provide: DeadlineMailer, useClass: DeadlineMailService },
    { provide: PasswordResetMailer, useClass: PasswordResetMail },
    { provide: NotificationRepository, useClass: PrismaNotificationRepository },
    { provide: EmailLogRepository, useClass: PrismaEmailLogRepository },
    {
      provide: EmailPreferenceRepository,
      useClass: PrismaEmailPreferenceRepository,
    },
    { provide: MailTransport, useFactory: () => new NodemailerMailTransport() },
  ],
  exports: [Notifier, MentionMailer, DeadlineMailer, PasswordResetMailer],
})
export class NotificationsModule {}
