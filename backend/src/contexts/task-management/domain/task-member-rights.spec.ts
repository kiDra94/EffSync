import { effectiveTaskFlags, TaskFlags } from "./task-member-rights";

// T99, decision I4 (M38): who holds which rights on a task
describe("effectiveTaskFlags", () => {
  const task = { createdBy: 2, assignedTo: 5 };
  const flags = (
    userId: number,
    memberFlags: number | null,
    privileged = false,
  ) =>
    effectiveTaskFlags({
      userId,
      chain: [{ ...task, memberFlags }],
      privileged,
    });

  it("gives the creator and Admin/Superuser every flag", () => {
    expect(flags(2, null)).toBe(TaskFlags.RWX);
    expect(flags(9, null, true)).toBe(TaskFlags.RWX);
  });

  it("gives the assignee READ and WRITE, plus what a member row adds", () => {
    expect(flags(5, null)).toBe(TaskFlags.READ | TaskFlags.WRITE);
    expect(flags(5, TaskFlags.EXECUTE)).toBe(TaskFlags.RWX);
  });

  it("gives an explicit member the row's flags, anyone else nothing", () => {
    expect(flags(7, TaskFlags.READ)).toBe(TaskFlags.READ);
    expect(flags(7, 0)).toBe(0);
    expect(flags(8, null)).toBe(0);
  });

  it("ignores bits beyond RWX", () => {
    expect(flags(7, 15)).toBe(TaskFlags.RWX);
  });

  // review of M38 (decision I4): a subtask's rights include its ancestors'
  it("adds the rights on every task above", () => {
    const subtask = { createdBy: 7, assignedTo: null, memberFlags: null };
    const project = {
      createdBy: 2,
      assignedTo: 5,
      memberFlags: TaskFlags.READ,
    };

    expect(
      effectiveTaskFlags({
        userId: 2,
        chain: [subtask, project],
        privileged: false,
      }),
    ).toBe(TaskFlags.RWX);
    expect(
      effectiveTaskFlags({
        userId: 5,
        chain: [subtask, project],
        privileged: false,
      }),
    ).toBe(TaskFlags.READ | TaskFlags.WRITE);
    expect(
      effectiveTaskFlags({
        userId: 3,
        chain: [subtask, project],
        privileged: false,
      }),
    ).toBe(TaskFlags.READ);
    expect(
      effectiveTaskFlags({ userId: 3, chain: [], privileged: false }),
    ).toBe(0);
  });
});
