/**
 * Public entry point of notifications (rule 3): other contexts notify users
 * only through these ports (M16, M23).
 */
export { Notifier } from "./notifier";
export { MentionMailer } from "./mention-mailer";
export { DeadlineMailer } from "./deadline-mailer";
