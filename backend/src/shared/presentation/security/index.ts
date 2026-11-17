/**
 * Guards and decorators for every context's controllers. They live in
 * identity-access (presentation/security); this re-export keeps the other
 * contexts from importing identity-access internals (GOALS.md target architecture).
 * Check order on a controller: JwtAuthGuard, RolesGuard, PermissionsGuard (T97).
 */
export * from "../../../contexts/identity-access/presentation/security";
