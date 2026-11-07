import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as nodemailer from "nodemailer";
import type { Transport } from "nodemailer";

/** Injection token of the nodemailer transporter the EmailService sends with. */
export const MAIL_TRANSPORT = "MAIL_TRANSPORT";

/**
 * Test transport (M13): writes each mail as {to, subject, html} JSON into a
 * directory, where the E2E tests read it. Nothing leaves the machine.
 */
function outboxTransport(dir: string): Transport {
  return {
    name: "outbox",
    version: "1",
    send(mail, callback) {
      const { to, subject, html } = mail.data;
      const messageId = `${Date.now()}-${randomUUID()}`;
      try {
        mkdirSync(dir, { recursive: true });
        writeFileSync(
          join(dir, `${messageId}.json`),
          JSON.stringify({ to, subject, html }),
        );
        callback(null, { envelope: mail.message.getEnvelope(), messageId });
      } catch (error) {
        callback(error as Error, undefined);
      }
    },
  };
}

/**
 * Production: SMTP from the SMTP_* variables. Tests (NODE_ENV=test): the
 * outbox in MAIL_OUTBOX_DIR, or nodemailer's JSON transport without one.
 * Development: Ethereal Email, which never delivers.
 */
export function createMailTransport(): nodemailer.Transporter {
  if (process.env.NODE_ENV === "production") {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
  if (process.env.NODE_ENV === "test") {
    const dir = process.env.MAIL_OUTBOX_DIR;
    return dir
      ? nodemailer.createTransport(outboxTransport(dir))
      : nodemailer.createTransport({ jsonTransport: true });
  }
  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    auth: {
      user: process.env.ETHEREAL_USER || "test@ethereal.email",
      pass: process.env.ETHEREAL_PASSWORD || "test-password",
    },
  });
}
