/**
 * Completion rules of a parent task (T53): a tree of AND/OR/XOR/NOT over
 * subtask ids. The parent counts as done when the rule holds for the set of
 * completed subtasks.
 */
type LeafNode = {
  type: "leaf";
  task_id: string;
};

type OperatorNode = {
  type: "operator";
  operator: "AND" | "OR" | "XOR" | "NOT";
  operands: ConditionNode[];
};

export type ConditionNode = LeafNode | OperatorNode;

export function evaluateCondition(
  node: ConditionNode,
  completedTaskIds: Set<string>,
): boolean {
  if (node.type === "leaf") {
    return completedTaskIds.has(String(node.task_id));
  }

  const results = node.operands.map((operand) =>
    evaluateCondition(operand, completedTaskIds),
  );

  switch (node.operator) {
    case "AND":
      return results.every((r) => r === true);
    case "OR":
      return results.some((r) => r === true);
    case "XOR":
      return results.filter((r) => r === true).length === 1;
    case "NOT":
      return !results[0];
  }
}

/** Whether the rule refers to the task anywhere in its tree. */
export function ruleContainsTask(
  rule: ConditionNode | null | undefined,
  taskId: string,
): boolean {
  if (!rule) return false;
  if (rule.type === "leaf") return String(rule.task_id) === String(taskId);
  if (rule.type === "operator") {
    return rule.operands.some((op) => ruleContainsTask(op, taskId));
  }
  return false;
}
