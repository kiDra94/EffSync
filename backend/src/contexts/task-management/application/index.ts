/**
 * Public entry point of task-management (rule 3): other contexts and the
 * legacy modules import only from here: the two ports the legacy WebSocket
 * and e-mail modules implement, and the completion from grades that grading
 * in documents calls (M17).
 */
export { TaskCompletionService } from "./task-completion.service";
export { TaskResubmissionService } from "./task-resubmission.service";
export { TaskChatService } from "./task-chat.service";
export { TaskRealtime } from "./ports/task-realtime";
export { MentionMailer } from "./ports/mention-mailer";
