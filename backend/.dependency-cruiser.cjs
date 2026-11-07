/**
 * Dependency rules of the target architecture (GOALS.md, "Dependency rules").
 * M10 adds them as warnings; M34 switches them to errors.
 * Run: npx depcruise src --config .dependency-cruiser.cjs
 */
const LAYERED = "src/(contexts/[^/]+|shared)";

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "domain-no-framework",
      comment:
        "Rule 1: domain/ imports only its own domain/ and shared/domain/ - nothing from NestJS, Prisma or other contexts.",
      severity: "warn",
      from: { path: "^src/contexts/([^/]+)/domain/" },
      to: { pathNot: ["^src/contexts/$1/domain/", "^src/shared/domain/"] },
    },
    {
      name: "domain-no-framework",
      comment: "Rule 1 for the shared kernel: shared/domain/ imports only itself.",
      severity: "warn",
      from: { path: "^src/shared/domain/" },
      to: { pathNot: "^src/shared/domain/" },
    },
    {
      name: "layers-inward",
      comment:
        "Rule 2: application/ never imports infrastructure/ or presentation/.",
      severity: "warn",
      from: { path: `^${LAYERED}/application/` },
      to: { path: `^${LAYERED}/(infrastructure|presentation)/` },
    },
    {
      name: "layers-inward",
      comment:
        "Rule 2: application/ uses the UnitOfWork port and repository ports, never Prisma itself. Prisma's generated row types may be imported type-only (no runtime dependency, G1).",
      severity: "warn",
      from: { path: `^${LAYERED}/application/` },
      to: {
        path: "node_modules/(@prisma|prisma)/",
        dependencyTypesNot: ["type-only"],
      },
    },
    {
      name: "layers-inward",
      comment: "Rule 2: infrastructure/ points to application/ or domain/, not to presentation/.",
      severity: "warn",
      from: { path: `^${LAYERED}/infrastructure/` },
      to: { path: `^${LAYERED}/presentation/` },
    },
    {
      name: "layers-inward",
      comment: "Rule 2: presentation/ goes through application/, not to infrastructure/.",
      severity: "warn",
      from: { path: `^${LAYERED}/presentation/` },
      to: { path: `^${LAYERED}/infrastructure/` },
    },
    {
      name: "context-via-application",
      comment:
        "Rule 3: another context is reached only through its application/index.ts.",
      severity: "warn",
      from: { path: "^src/contexts/([^/]+)/" },
      to: {
        path: "^src/contexts/",
        pathNot: ["^src/contexts/$1/", "^src/contexts/[^/]+/application/index\\.ts$"],
      },
    },
    {
      name: "context-via-application",
      comment:
        "Rule 3 during the migration: the legacy src/modules/ count as other contexts, in both directions.",
      severity: "warn",
      from: { path: "^src/contexts/" },
      to: { path: "^src/modules/" },
    },
    {
      name: "context-via-application",
      comment:
        "Rule 3 during the migration: legacy modules reach a context only through its application/index.ts.",
      severity: "warn",
      from: { path: "^src/modules/" },
      to: {
        path: "^src/contexts/",
        pathNot: "^src/contexts/[^/]+/application/index\\.ts$",
      },
    },
    {
      name: "context-via-application",
      comment:
        "Rule 3 for the shared kernel: shared/ depends on no context, except the deliberate re-export of identity-access's guards in shared/presentation/security/.",
      severity: "warn",
      from: { path: "^src/shared/", pathNot: "^src/shared/presentation/security/" },
      to: { path: "^src/contexts/" },
    },
    {
      name: "context-via-application",
      comment: "The security re-export points only at identity-access's security code.",
      severity: "warn",
      from: { path: "^src/shared/presentation/security/" },
      to: {
        path: "^src/contexts/",
        pathNot: "^src/contexts/identity-access/presentation/security/",
      },
    },
    {
      name: "no-circular",
      comment:
        "Rule 4: identity-access depends on no other context (and on no legacy module). Cycles between contexts are checked at context level by scripts/check-context-cycles.cjs.",
      severity: "warn",
      from: { path: "^src/contexts/identity-access/" },
      to: {
        path: "^src/(contexts|modules)/",
        pathNot: "^src/contexts/identity-access/",
      },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    // specs may reach across layers to set up their fixtures
    // specs and their shared fixtures (M15) may wire infrastructure directly
    exclude: { path: "\\.(spec|fixtures)\\.ts$" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
