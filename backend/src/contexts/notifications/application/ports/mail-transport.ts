/** One outgoing e-mail. */
export interface OutgoingMail {
  to: string;
  subject: string;
  html: string;
}

/** Sends e-mail (port; nodemailer in infrastructure, by environment). */
export abstract class MailTransport {
  /** The message ID; throws if the mail couldn't be sent. */
  abstract send(mail: OutgoingMail): Promise<string>;
}
