/** The authenticated user that JwtStrategy.validate puts on `req.user`. */
export interface AuthenticatedUser {
  id: number;
  userId: number;
  username: string;
  email: string;
  firstname: string;
  lastname: string;
  role: string;
}
