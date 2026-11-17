import type { TaskRepository } from "./ports/task.repository";
import { TaskChatService } from "./task-chat.service";
import type { TaskVisibilityService } from "./task-visibility.service";

// T29 (M21): the people of a task chat
describe("TaskChatService", () => {
  const tasks = {
    findChatParticipants: jest.fn().mockResolvedValue({
      title: "Referat",
      created_by: 2,
      assigned_to: 4,
      task_members: [{ user_id: 4 }, { user_id: 5 }],
    }),
  };
  const visibility = { isVisible: jest.fn().mockResolvedValue(true) };
  const service = new TaskChatService(
    tasks as unknown as TaskRepository,
    visibility as unknown as TaskVisibilityService,
  );

  it("lists creator, assignee and members once", async () => {
    await expect(service.forChat(7, 4)).resolves.toEqual({
      title: "Referat",
      creatorId: 2,
      participantIds: [2, 4, 5],
    });
  });

  it("is null for someone who doesn't see the task (decision B3)", async () => {
    visibility.isVisible.mockResolvedValueOnce(false);

    await expect(service.forChat(7, 9)).resolves.toBeNull();
  });
});
