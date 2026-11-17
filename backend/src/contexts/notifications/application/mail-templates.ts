/**
 * The HTML of the e-mails (moved from EmailService in M23). Text from users
 * (titles, names, comments) is escaped (review M23); the links go to the
 * frontend (FRONTEND_URL, like the password-reset link).
 */
import { frontendUrl } from "../../../shared/application/frontend-url";

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Text as HTML: no markup or links from users in the app's mails. */
function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/** The password-reset mail (T52, M13). */
export function generatePasswordResetEmailHtml(link: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Passwort zurücksetzen</h2>
      <p>Für dein EffSync-Konto wurde ein neues Passwort angefordert.</p>
      <p><a href="${link}" style="background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Neues Passwort festlegen</a></p>
      <p>Der Link ist 30 Minuten gültig und funktioniert nur einmal. Wenn du kein neues Passwort angefordert hast, kannst du diese E-Mail ignorieren.</p>
    </div>
  `;
}
/** The deadline reminder (T46). */
export function generateDeadlineEmailHtml(
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
          <p>deine Aufgabe <strong>"${escapeHtml(taskTitle)}"</strong> ${daysUntilDeadline <= 0 ? "ist überfällig!" : `ist fällig am <strong>${formattedDate}</strong>`}.</p>
          
          ${daysUntilDeadline > 0 ? `<p>Es bleiben noch <strong>${daysUntilDeadline} Tag(e)</strong> bis zur Deadline.</p>` : `<p><strong>Bitte kümmere dich um diese Aufgabe!</strong></p>`}
          
          <p>Melde dich in EffSync an, um mehr Details zu sehen und die Aufgabe zu bearbeiten.</p>
          
          <a href="${frontendUrl()}/tasks" class="button">Zur Aufgabe</a>
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
/** The @mention mail (T09). */
export function generateMentionEmailHtml(
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
          <p><strong>${escapeHtml(mentionerName)}</strong> hat dich in einem Kommentar erwähnt:</p>
          <p><strong>Aufgabe:</strong> ${escapeHtml(taskTitle)}</p>
          
          <div class="quote">
            <p><strong>Kommentar:</strong></p>
            <p>"${escapeHtml(commentExcerpt)}"</p>
          </div>
          
          <p>Schau vorbei, um die vollständige Diskussion zu sehen!</p>
          
          <a href="${frontendUrl()}/tasks" class="button">Zum Kommentar</a>
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
