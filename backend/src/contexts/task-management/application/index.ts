/**
 * Public entry point of task-management (rule 3): other contexts import only
 * from here: the completion from grades and the resubmission that grading in
 * documents calls (M17, M19), the task side of task chats (M21), the
 * visible set the dashboard counts (M24), and the realtime port.
 */
export { TaskCompletionService } from "./task-completion.service";
export { TaskResubmissionService } from "./task-resubmission.service";
export { TaskChatService } from "./task-chat.service";
export { TaskVisibilityService } from "./task-visibility.service";
export { TaskRealtime } from "./ports/task-realtime";
