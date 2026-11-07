import { Inject, Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";
import { MAIL_TRANSPORT } from "./mail-transport";

const PASSWORD_RESET_COOLDOWN_MS = 5 * 60 * 1000;

@Injectable()
export class EmailService {
  private logger = new Logger("EmailService");

  // the transport depends on the environment (mail-transport.ts)
  constructor(
    private prisma: PrismaService,
    @Inject(MAIL_TRANSPORT) private transporter: nodemailer.Transporter,
  ) {}

  /**
   * Sends the e-mail for a task that is due
   */
  async sendDeadlineEmail(
    userId: number,
    userEmail: string,
    taskTitle: string,
    deadline: Date,
  ): Promise<boolean> {
    try {
      const daysUntilDeadline = this.getDaysUntil(deadline);

      const subject =
        daysUntilDeadline <= 0
          ? `🚨 Aufgabe überfällig: ${taskTitle}`
          : `⏰ Aufgabe fällig in ${daysUntilDeadline} Tag(en): ${taskTitle}`;

      const html = this.generateDeadlineEmailHtml(
        taskTitle,
        deadline,
        daysUntilDeadline,
      );

      await this.sendEmail(userEmail, subject, html);
      await this.logEmail(userId, userEmail, subject, "deadline", "sent");

      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send deadline email to ${userEmail}:`,
        error,
      );
      await this.logEmail(
        userId,
        userEmail,
        `Deadline: ${taskTitle}`,
        "deadline",
        "failed",
        error.message,
      );
      return false;
    }
  }

  /**
   * Sends the e-mail for @mentions in comments
   */
  async sendMentionEmail(
    mentionedUserId: number,
    mentionedUserEmail: string,
    mentionerName: string,
    taskTitle: string,
    commentExcerpt: string,
  ): Promise<boolean> {
    try {
      const subject = `📢 Du wurdest erwähnt: ${taskTitle}`;
      const html = this.generateMentionEmailHtml(
        mentionerName,
        taskTitle,
        commentExcerpt,
      );

      await this.sendEmail(mentionedUserEmail, subject, html);
      await this.logEmail(
        mentionedUserId,
        mentionedUserEmail,
        subject,
        "mention",
        "sent",
      );

      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send mention email to ${mentionedUserEmail}:`,
        error,
      );
      await this.logEmail(
        mentionedUserId,
        mentionedUserEmail,
        `Mention: ${taskTitle}`,
        "mention",
        "failed",
        error.message,
      );
      return false;
    }
  }

  /**
   * Sends the e-mail for comments
   */
  async sendCommentEmail(
    userId: number,
    userEmail: string,
    commenterName: string,
    taskTitle: string,
    commentText: string,
  ): Promise<boolean> {
    try {
      const subject = `💬 Neuer Kommentar zu: ${taskTitle}`;
      const html = this.generateCommentEmailHtml(
        commenterName,
        taskTitle,
        commentText,
      );

      await this.sendEmail(userEmail, subject, html);
      await this.logEmail(userId, userEmail, subject, "comment", "sent");

      return true;
    } catch (error) {
      this.logger.error(`Failed to send comment email to ${userEmail}:`, error);
      await this.logEmail(
        userId,
        userEmail,
        `Comment: ${taskTitle}`,
        "comment",
        "failed",
        error.message,
      );
      return false;
    }
  }

  /**
   * Sends the password-reset link (T52, M13). Valid 30 minutes and only until
   * the password has changed. At most one per account every 5 minutes, so the
   * public forgot-password endpoint can't flood an inbox.
   */
  async sendPasswordResetEmail(
    userId: number,
    userEmail: string,
    link: string,
  ): Promise<boolean> {
    const subject = "EffSync: Passwort zurücksetzen";
    const recent = await this.prisma.email_logs.findFirst({
      where: {
        user_id: userId,
        email_type: "password_reset",
        status: "sent",
        sent_at: { gte: new Date(Date.now() - PASSWORD_RESET_COOLDOWN_MS) },
      },
    });
    if (recent) return true;
    try {
      await this.sendEmail(
        userEmail,
        subject,
        this.generatePasswordResetEmailHtml(link),
      );
      await this.logEmail(userId, userEmail, subject, "password_reset", "sent");
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to user ${userId}:`,
        error,
      );
      await this.logEmail(
        userId,
        userEmail,
        subject,
        "password_reset",
        "failed",
        error instanceof Error ? error.message : String(error),
      );
      return false;
    }
  }

  private generatePasswordResetEmailHtml(link: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Passwort zurücksetzen</h2>
        <p>Für dein EffSync-Konto wurde ein neues Passwort angefordert.</p>
        <p><a href="${link}" style="background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Neues Passwort festlegen</a></p>
        <p>Der Link ist 30 Minuten gültig und funktioniert nur einmal. Wenn du kein neues Passwort angefordert hast, kannst du diese E-Mail ignorieren.</p>
      </div>
    `;
  }

  /**
   * Generic method for sending e-mails
   */
  private async sendEmail(to: string, subject: string, html: string) {
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"EffSync" <noreply@effsync.local>',
      to,
      subject,
      html,
    };

    const info = await this.transporter.sendMail(mailOptions);
    this.logger.log(`Email sent successfully: ${info.messageId} to ${to}`);
    return info;
  }

  /**
   * Logs a sent e-mail
   */
  private async logEmail(
    userId: number,
    recipient: string,
    subject: string,
    emailType: string,
    status: string,
    errorMessage?: string,
  ) {
    try {
      await this.prisma.email_logs.create({
        data: {
          user_id: userId,
          recipient,
          subject,
          email_type: emailType,
          status,
          error_message: errorMessage,
          sent_at: status === "sent" ? new Date() : null,
        },
      });
    } catch (error) {
      this.logger.error("Failed to log email:", error);
    }
  }

  /**
   * HTML template for the due-date e-mail
   */
  private generateDeadlineEmailHtml(
    taskTitle: string,
    deadline: Date,
    daysUntilDeadline: number,
  ): string {
    const formattedDate = deadline.toLocaleDateString("de-DE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const icon = daysUntilDeadline <= 0 ? "🚨" : "⏰";

    return `
      <!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; }
          .content { padding: 20px; background: #f9f9f9; border-radius: 8px; margin-top: 20px; }
          .button { background-color: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 15px; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>${icon} ${daysUntilDeadline <= 0 ? "Aufgabe ist überfällig!" : "Aufgabe Erinnerung"}</h2>
          </div>
          <div class="content">
            <p>Hallo,</p>
            <p>deine Aufgabe <strong>"${taskTitle}"</strong> ${daysUntilDeadline <= 0 ? "ist überfällig!" : `ist fällig am <strong>${formattedDate}</strong>`}.</p>
            
            ${daysUntilDeadline > 0 ? `<p>Es bleiben noch <strong>${daysUntilDeadline} Tag(e)</strong> bis zur Deadline.</p>` : `<p><strong>Bitte kümmere dich um diese Aufgabe!</strong></p>`}
            
            <p>Melde dich in EffSync an, um mehr Details zu sehen und die Aufgabe zu bearbeiten.</p>
            
            <a href="${process.env.APP_URL || "http://localhost:5173"}/tasks" class="button">Zur Aufgabe</a>
          </div>
          <div class="footer">
            <p>Dies ist eine automatische E-Mail. Bitte antworte nicht auf diese E-Mail.</p>
            <p>© EffSync ${new Date().getFullYear()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * HTML template for the mention e-mail
   */
  private generateMentionEmailHtml(
    mentionerName: string,
    taskTitle: string,
    commentExcerpt: string,
  ): string {
    return `
      <!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 8px; }
          .content { padding: 20px; background: #f9f9f9; border-radius: 8px; margin-top: 20px; }
          .quote { background: #e8f4f8; border-left: 4px solid #667eea; padding: 15px; margin: 15px 0; border-radius: 4px; }
          .button { background-color: #f5576c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 15px; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>📢 Du wurdest erwähnt!</h2>
          </div>
          <div class="content">
            <p>Hallo,</p>
            <p><strong>${mentionerName}</strong> hat dich in einem Kommentar erwähnt:</p>
            <p><strong>Aufgabe:</strong> ${taskTitle}</p>
            
            <div class="quote">
              <p><strong>Kommentar:</strong></p>
              <p>"${commentExcerpt}"</p>
            </div>
            
            <p>Schau vorbei, um die vollständige Diskussion zu sehen!</p>
            
            <a href="${process.env.APP_URL || "http://localhost:5173"}/tasks" class="button">Zum Kommentar</a>
          </div>
          <div class="footer">
            <p>Dies ist eine automatische E-Mail. Bitte antworte nicht auf diese E-Mail.</p>
            <p>© EffSync ${new Date().getFullYear()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * HTML template for the comment e-mail
   */
  private generateCommentEmailHtml(
    commenterName: string,
    taskTitle: string,
    commentText: string,
  ): string {
    return `
      <!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; }
          .content { padding: 20px; background: #f9f9f9; border-radius: 8px; margin-top: 20px; }
          .quote { background: #e8f4f8; border-left: 4px solid #667eea; padding: 15px; margin: 15px 0; border-radius: 4px; }
          .button { background-color: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 15px; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>💬 Neuer Kommentar</h2>
          </div>
          <div class="content">
            <p>Hallo,</p>
            <p><strong>${commenterName}</strong> hat einen Kommentar zu deiner Aufgabe hinzugefügt:</p>
            <p><strong>Aufgabe:</strong> ${taskTitle}</p>
            
            <div class="quote">
              <p><strong>Kommentar:</strong></p>
              <p>"${commentText}"</p>
            </div>
            
            <p>Schau vorbei, um zu antworten!</p>
            
            <a href="${process.env.APP_URL || "http://localhost:5173"}/tasks" class="button">Zum Kommentar</a>
          </div>
          <div class="footer">
            <p>Dies ist eine automatische E-Mail. Bitte antworte nicht auf diese E-Mail.</p>
            <p>© EffSync ${new Date().getFullYear()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Helper: computes the days until the deadline
   */
  private getDaysUntil(date: Date): number {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const deadline = new Date(date);
    deadline.setHours(0, 0, 0, 0);

    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }
}
