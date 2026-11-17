#!/usr/bin/env node
/**
 * Rule 4 at context level (GOALS.md "Dependency rules"): no cycle between
 * bounded contexts. dependency-cruiser's `circular` only finds cycles between
 * files, so context A -> B -> A through different files would go unnoticed.
 *
 * Usage: node scripts/check-context-cycles.cjs [--severity warn|error] < result.json
 * (the JSON of `depcruise src --config .dependency-cruiser.cjs --output-type json`;
 * `npm run depcruise:contexts` does both). Exits 1 on a cycle; since M34 that
 * is the default, `--severity warn` only reports.
 */
const severity = process.argv.includes("--severity")
  ? process.argv[process.argv.indexOf("--severity") + 1]
  : "error";

let input = "";
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  const result = JSON.parse(input);
  const contextOf = (path) => /^src\/contexts\/([^/]+)\//.exec(path)?.[1];

  // context -> set of contexts it depends on (type-only imports don't count)
  const edges = new Map();
  for (const module of result.modules) {
    const from = contextOf(module.source);
    if (!from) continue;
    for (const dependency of module.dependencies) {
      const to = contextOf(dependency.resolved);
      if (!to || to === from) continue;
      if ((dependency.dependencyTypes || []).includes("type-only")) continue;
      if (!edges.has(from)) edges.set(from, new Set());
      edges.get(from).add(to);
    }
  }

  const cycles = [];
  const visit = (node, path) => {
    for (const next of edges.get(node) || []) {
      const at = path.indexOf(next);
      if (at >= 0) cycles.push([...path.slice(at), next].join(" -> "));
      else visit(next, [...path, next]);
    }
  };
  for (const start of edges.keys()) visit(start, [start]);

  const unique = [...new Set(cycles.map((c) => c.split(" -> ").slice(0, -1).sort().join(",")))];
  if (unique.length === 0) {
    console.log(`✔ no cycles between contexts (${edges.size} contexts with dependencies)`);
    return;
  }
  for (const cycle of cycles) console.log(`  ${severity} no-circular (context level): ${cycle}`);
  console.log(`x ${unique.length} cycle(s) between contexts`);
  if (severity === "error") process.exitCode = 1;
});
