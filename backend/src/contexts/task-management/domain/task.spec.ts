import { involvedUsers, isCompletionWithoutFullProgress } from "./task";

// T100 (M16): COMPLETED only at 100 %; T107/T44: who is involved in a task
describe("Task rules", () => {
  it.each([
    ["COMPLETED", 40, true],
    ["COMPLETED", null, true],
    ["COMPLETED", 100, false],
    ["IN_PROGRESS", 40, false],
    [null, 40, false],
  ] as const)(
    "status %s with progress %s violates the rule: %s",
    (status, progress, expected) => {
      expect(isCompletionWithoutFullProgress(status, progress)).toBe(expected);
    },
  );

  it("lists creator, assignee and members once each", () => {
    expect(involvedUsers({ created_by: 5, assigned_to: 6 }, [6, 7, 7])).toEqual(
      [5, 6, 7],
    );
    expect(involvedUsers({ created_by: null, assigned_to: null }, [])).toEqual(
      [],
    );
  });
});
