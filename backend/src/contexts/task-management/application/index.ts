/**
 * Public entry point of task-management (rule 3): other contexts import only
 * from here: the completion from grades and the resubmission that grading in
 * documents calls (M17, M19), the task side of task chats (M21), and the
 * realtime port.
 */
export { TaskCompletionService } from "./task-completion.service";
export { TaskResubmissionService } from "./task-resubmission.service";
export { TaskChatService } from "./task-chat.service";
export { TaskRealtime } from "./ports/task-realtime";
