import { SetMetadata } from "@nestjs/common";

/**
 * @Roles() Decorator
 *
 * Wird verwendet in Kombination mit RolesGuard.
 * Definiert die erforderlichen Rollen für einen Endpoint.
 *
 * Beispiele:
 * @Roles('Teacher')
 * @Roles('Admin', 'Manager')
 * @Roles()  // Leerer Array = kein RolesGuard-Schutz
 *
 * Verwendung im Controller:
 * @Get()
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('Teacher', 'Admin')
 * async findAll() {
 *   // Nur User mit Rolle Teacher ODER Admin können diesen Endpoint aufrufen
 * }
 */
export const Roles = (...roles: string[]) => SetMetadata("roles", roles);
