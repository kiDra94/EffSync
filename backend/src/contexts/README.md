# Bounded contexts (GOALS.md, target architecture)

| Context               | Takes over                                                       |
| --------------------- | ---------------------------------------------------------------- |
| `identity-access`     | auth, users, roles, permissions, the guards and decorators       |
| `task-management`     | tasks, members, templates, grade remarks, comments, activity log |
| `communication`       | chat rooms, chat messages, the chat handlers of the gateway      |
| `documents-notes`     | documents (incl. grading), notes                                 |
| `school-organization` | classes, departments, subjects, rooms, schedules, lesson slots   |
| `notifications`       | notifications, e-mail, preferences, cron jobs                    |
| `reporting`           | metrics for the dashboard                                        |

`src/shared/` is the shared kernel: the Prisma client, the unit of work, config validation, the Socket.io transport and the re-exported security decorators.

Each context has four layers, and its NestJS module (`<context>.module.ts`, the composition root that wires the layers together) lives at the context root, outside the layers:

```
<context>.module.ts
domain/          entities, aggregates, value objects, repository interfaces (ports)
application/     use cases and their transaction boundary (UnitOfWork);
                 index.ts is the only entry point for other contexts
infrastructure/  Prisma repositories and adapters that implement the ports
presentation/    controllers, DTOs, gateway handlers
```

The dependency rules are checked by `.dependency-cruiser.cjs` (`npx depcruise src --config .dependency-cruiser.cjs`):

1. `domain-no-framework`: `domain/` imports only its own `domain/` and `shared/domain/`, nothing from NestJS, Prisma or other contexts.
2. `layers-inward`: presentation → application → domain; infrastructure → application | domain; application never imports infrastructure or presentation, and Prisma only as `import type` (generated row types in repository ports, decision G1).
3. `context-via-application`: another context is reached only through its `application/index.ts`. `shared/` depends on no context, except `shared/presentation/security/`, which re-exports identity-access's guards and decorators.
4. `no-circular`: `identity-access` depends on no other context. Cycles between contexts are checked at context level by `scripts/check-context-cycles.cjs` (`npm run depcruise:contexts`), because dependency-cruiser's own cycle check only sees cycles between files; type-only imports don't count.

Repositories take the use case's `Transaction` (`shared/domain/transaction.ts`) or ask `PrismaUnitOfWork.client()` for it. A nested `UnitOfWork.run()` joins the open transaction.

All four rules have severity `error` (since M34): CI fails on any violation.
