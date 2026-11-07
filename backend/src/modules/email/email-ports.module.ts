import { Global, Module } from "@nestjs/common";
import { PasswordResetMailer } from "../../contexts/identity-access/application";
import { MentionMailer } from "../../contexts/task-management/application";
import { EmailModule } from "./email.module";
import { EmailService } from "./email.service";
import { EmailPasswordResetMailer } from "./email-password-reset.mailer";

/**
 * Binds the contexts' e-mail ports to the legacy EmailService: identity-access's
 * PasswordResetMailer (M13) and task-management's MentionMailer (M15).
 * Global, because a context module may not import a legacy module (dependency
 * rule context-via-application). Goes away with M23.
 */
@Global()
@Module({
  imports: [EmailModule],
  providers: [
    { provide: PasswordResetMailer, useClass: EmailPasswordResetMailer },
    { provide: MentionMailer, useExisting: EmailService },
  ],
  exports: [PasswordResetMailer, MentionMailer],
})
export class EmailPortsModule {}
