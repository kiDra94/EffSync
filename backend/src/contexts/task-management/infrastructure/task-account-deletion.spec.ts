import { AccountDeletionRegistry } from "../../identity-access/application";
import { PrismaUnitOfWork } from "../../../shared/infrastructure/prisma/prisma-unit-of-work";
import { TaskAccountDeletion } from "./task-account-deletion";

// T10, decision H1 (M14), moved here in M15 step 6: task-management's part of
// an account deletion, in identity-access's unit of work
describe("TaskAccountDeletion", () => {
  const table = () => ({ updateMany: jest.fn() });
  const tx = {
    tasks: table(),
    comments: table(),
    task_templates: table(),
    task_grade: table(),
    task_activity_log: table(),
  };
  const registry = new AccountDeletionRegistry();
  const participant = new TaskAccountDeletion(
    { client: () => tx } as unknown as PrismaUnitOfWork,
    registry,
  );

  beforeAll(async () => {
    participant.onModuleInit();
    await registry.anonymizeUser(5);
  });

  it.each([
    ["tasks", "created_by"],
    ["comments", "created_by"],
    ["task_templates", "created_by"],
    ["task_grade", "user_id"],
    ["task_activity_log", "user_id"],
  ] as const)("moves %s.%s to the ghost user", (name, column) => {
    expect(tx[name].updateMany).toHaveBeenCalledWith({
      where: { [column]: 5 },
      data: { [column]: 0 },
    });
  });

  it("ends the user's assignments", () => {
    expect(tx.tasks.updateMany).toHaveBeenCalledWith({
      where: { assigned_to: 5 },
      data: { assigned_to: null },
    });
  });
});
