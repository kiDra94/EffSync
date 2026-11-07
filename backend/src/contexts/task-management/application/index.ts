/**
 * Public entry point of task-management (rule 3): other contexts and the
 * legacy modules import only from here. Today that is the two ports the
 * legacy WebSocket and e-mail modules implement.
 */
export { TaskRealtime } from "./ports/task-realtime";
export { MentionMailer } from "./ports/mention-mailer";
