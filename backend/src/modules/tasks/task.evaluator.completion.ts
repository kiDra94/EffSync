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
