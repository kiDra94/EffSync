import type { DeadlineMailer, Notifier } from "../../notifications/application";
import type { TaskRepository } from "./ports/task.repository";
import { TaskDeadlinesService } from "./task-deadlines.service";
import type { TaskLockingService } from "./task-locking.service";

// T46 and feature #27 (M23, EmailCronService before): the daily reminder and
// the hourly overdue lock
describe("TaskDeadlinesService", () => {
  const NOW = new Date("2026-11-10T09:00:00");
  const assignee = { user_id: 4, email: "felix@student.htl.at" };
  let tasks: { findDueBetween: jest.Mock; findOverdueUnlocked: jest.Mock };
  let locking: { lockOverdueTask: jest.Mock };
  let mailer: { sendDeadlineReminder: jest.Mock };
  let notifier: { notify: jest.Mock };
  let service: TaskDeadlinesService;

  beforeEach(() => {
    tasks = {
      findDueBetween: jest.fn().mockResolvedValue([]),
      findOverdueUnlocked: jest.fn().mockResolvedValue([]),
    };
    locking = { lockOverdueTask: jest.fn() };
    mailer = { sendDeadlineReminder: jest.fn().mockResolvedValue(true) };
    notifier = { notify: jest.fn() };
    service = new TaskDeadlinesService(
      tasks as unknown as TaskRepository,
      locking as unknown as TaskLockingService,
      mailer as unknown as DeadlineMailer,
      notifier as unknown as Notifier,
    );
  });

  describe("daily reminder (T46)", () => {
    // review M23: from now, not from midnight (an overdue task is the hourly job's)
    it("looks from now up to the end of the third day ahead", async () => {
      await service.remindUpcoming(NOW);

      const [[from, to]] = tasks.findDueBetween.mock.calls as [[Date, Date]];
      expect(from).toEqual(NOW);
      expect(to).toEqual(new Date("2026-11-13T23:59:59.999"));
    });

    // review M23: the in-app text counts calendar days, like the mail
    it("counts calendar days in the in-app text", async () => {
      tasks.findDueBetween.mockResolvedValue([
        {
          task_id: 8,
          title: "Spät",
          deadline: new Date("2026-11-12T23:00:00"),
          assignee,
        },
      ]);

      await service.remindUpcoming(NOW);

      expect(notifier.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          text: '⏰ Aufgabe "Spät" ist fällig in 2 Tag(en)',
        }),
      );
    });

    // review M23: one task's failure doesn't stop the others' reminders
    it("goes on with the next task when one fails", async () => {
      tasks.findDueBetween.mockResolvedValue([
        { task_id: 1, title: "A", deadline: NOW, assignee },
        { task_id: 2, title: "B", deadline: NOW, assignee },
      ]);
      mailer.sendDeadlineReminder.mockRejectedValueOnce(new Error("smtp"));

      await service.remindUpcoming(NOW);

      expect(notifier.notify).toHaveBeenCalledTimes(1);
      expect(notifier.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          text: '⏰ Aufgabe "B" ist fällig in 0 Tag(en)',
        }),
      );
    });

    it("mails the assignee and notifies them in the app", async () => {
      const deadline = new Date("2026-11-12T09:00:00");
      tasks.findDueBetween.mockResolvedValue([
        { task_id: 7, title: "Referat", deadline, assignee },
      ]);

      await service.remindUpcoming(NOW);

      expect(mailer.sendDeadlineReminder).toHaveBeenCalledWith(
        assignee,
        "Referat",
        deadline,
      );
      expect(notifier.notify).toHaveBeenCalledWith({
        userId: 4,
        type: "task_deadline",
        text: '⏰ Aufgabe "Referat" ist fällig in 2 Tag(en)',
      });
      expect(locking.lockOverdueTask).not.toHaveBeenCalled();
    });
  });

  describe("hourly overdue job (feature #27)", () => {
    it("locks each overdue task, mails and notifies its assignee", async () => {
      const deadline = new Date("2026-11-09T12:00:00");
      tasks.findOverdueUnlocked.mockResolvedValue([
        { task_id: 7, title: "Referat", deadline, assignee },
      ]);

      await service.lockOverdue(NOW);

      expect(tasks.findOverdueUnlocked).toHaveBeenCalledWith(NOW);
      expect(locking.lockOverdueTask).toHaveBeenCalledWith(7, "OVERDUE");
      expect(mailer.sendDeadlineReminder).toHaveBeenCalledWith(
        assignee,
        "Referat",
        deadline,
      );
      expect(notifier.notify).toHaveBeenCalledWith({
        userId: 4,
        type: "task_overdue",
        text: '🚨 AUFGABE ÜBERFÄLLIG: "Referat" wurde automatisch gesperrt!',
      });
    });

    it("does nothing without overdue tasks", async () => {
      await service.lockOverdue(NOW);

      expect(locking.lockOverdueTask).not.toHaveBeenCalled();
      expect(notifier.notify).not.toHaveBeenCalled();
    });
  });
});
