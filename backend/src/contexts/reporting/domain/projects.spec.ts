import { projectProgress } from "./projects";

// T39 (FA-34, decision Q2): a project's progress over its subtree
describe("projectProgress", () => {
  it("is the share of completed tasks below the project", () => {
    expect(projectProgress({ total: 4, completed: 1 }, 0)).toBe(25);
    expect(projectProgress({ total: 3, completed: 2 }, 10)).toBe(67);
  });

  it("is the project's own progress when it has no subtasks", () => {
    expect(projectProgress({ total: 0, completed: 0 }, 40)).toBe(40);
    expect(projectProgress(undefined, null)).toBe(0);
  });
});
