import { Global, Module } from "@nestjs/common";
import { PasswordResetMailer } from "../../contexts/identity-access/application";
import { EmailModule } from "./email.module";
import { EmailPasswordResetMailer } from "./email-password-reset.mailer";

/**
 * Binds identity-access's PasswordResetMailer port (M13). Global, because
 * IdentityAccessModule may not import a legacy module (dependency rule
 * context-via-application).
 */
@Global()
@Module({
  imports: [EmailModule],
  providers: [
    { provide: PasswordResetMailer, useClass: EmailPasswordResetMailer },
  ],
  exports: [PasswordResetMailer],
})
export class PasswordResetMailModule {}
