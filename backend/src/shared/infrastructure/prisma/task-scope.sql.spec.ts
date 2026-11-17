import { taskScopeSql, withRecursive } from "./task-scope.sql";

// M37: the visible set (decision B3) as SQL for the list and the metrics
describe("taskScopeSql", () => {
  it("reads all tasks without a CTE, and none for no user", () => {
    expect(taskScopeSql({ all: true })).toMatchObject({ cte: null });
    expect(taskScopeSql({ all: true }).where.sql).toBe("TRUE");
    expect(taskScopeSql({ none: true }).where.sql).toBe("FALSE");
  });

  it("limits to the user's own, assigned and member tasks and their subtasks", () => {
    const { cte, where } = taskScopeSql({ viewerId: 7 });

    // three index scans, not one scan of all tasks with OR (M37)
    expect(cte!.sql).toMatch(/FROM tasks WHERE created_by = \?/);
    expect(cte!.sql).toMatch(/FROM tasks WHERE assigned_to = \?/);
    expect(cte!.sql).toMatch(/FROM task_members WHERE user_id = \?/);
    // the subtasks, recursively; UNION stops at a cycle
    expect(cte!.sql).toMatch(/UNION\s+SELECT c\.task_id FROM tasks c/);
    expect(cte!.values).toEqual([7, 7, 7]);
    expect(where.sql).toBe("t.task_id IN (SELECT task_id FROM visible)");
  });

  it("writes WITH RECURSIVE only for CTEs that exist", () => {
    expect(withRecursive(null).sql).toBe("");
    expect(withRecursive(taskScopeSql({ viewerId: 7 }).cte).sql).toMatch(
      /^WITH RECURSIVE visible AS/,
    );
  });
});
