/**
 * The request after JwtAuthGuard: `req.user` is what JwtStrategy.validate returns.
 */
export interface AuthenticatedRequest {
  user: {
    id: number;
    userId: number;
    username: string;
    email: string;
    firstname: string;
    lastname: string;
    role: string;
  };
}
