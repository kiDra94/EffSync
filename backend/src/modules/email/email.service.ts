import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private logger = new Logger("EmailService");

  constructor(private prisma: PrismaService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // Konfiguriere Nodemailer basierend auf Environment
    // Bei Entwicklung: Ethereal Email (kostenlos, kein echter Server nötig)
    // Bei Produktion: Echter SMTP Server (Gmail, SendGrid, etc.)

    if (process.env.NODE_ENV === "production") {
      // Production: SendGrid, Gmail, etc.
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });
    } else {
      // Development: Ethereal Email (test service)
      this.transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        auth: {
          user: process.env.ETHEREAL_USER || "test@ethereal.email",
          pass: process.env.ETHEREAL_PASSWORD || "test-password",
        },
      });
      this.logger.debug("✉️  Using Ethereal Email for testing");
    }
  }

  /**
   * Sende E-Mail für Task-Fälligkeit
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
   * Sende E-Mail für @Mentions in Kommentaren
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
   * Sende E-Mail für Kommentare
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
   * Generische Methode zum Versenden von E-Mails
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
   * Protokolliere E-Mail-Versand
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
   * HTML-Template für Fälligkeits-E-Mail
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
   * HTML-Template für Mention-E-Mail
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
   * HTML-Template für Kommentar-E-Mail
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
   * Hilfsfunktion: Berechne Tage bis Deadline
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
