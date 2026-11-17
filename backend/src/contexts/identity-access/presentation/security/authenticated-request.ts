import type { AuthenticatedUser } from "../../application/authenticated-user";

/**
 * The request after JwtAuthGuard: `req.user` is what JwtStrategy.validate returns.
 */
export interface AuthenticatedRequest {
  user: AuthenticatedUser;
}
