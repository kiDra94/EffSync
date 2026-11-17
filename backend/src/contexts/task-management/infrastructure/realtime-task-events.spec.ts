import type { RealtimePublisher } from "../../../shared/application/realtime";
import { RealtimeTaskEvents } from "./realtime-task-events";

// M20: task events go through the shared transport with the event names the
// frontend listens to (they were the WebsocketGateway's)
describe("RealtimeTaskEvents", () => {
  const publisher = { toUser: jest.fn() };
  const events = new RealtimeTaskEvents(
    publisher as unknown as RealtimePublisher,
  );

  it("sends task:updated to the user", () => {
    events.emitTaskUpdated(4, { task_id: 1 });

    expect(publisher.toUser).toHaveBeenCalledWith(4, "task:updated", {
      task_id: 1,
    });
  });

  it("sends task:locked with the task, the reason and a timestamp", () => {
    events.emitTaskLocked(4, 1, "OVERDUE");

    expect(publisher.toUser).toHaveBeenCalledWith(4, "task:locked", {
      taskId: 1,
      reason: "OVERDUE",
      timestamp: expect.any(Date) as unknown,
    });
  });
});
