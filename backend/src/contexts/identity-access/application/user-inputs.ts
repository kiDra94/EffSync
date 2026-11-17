/** Input of registration and user creation (CreateUserDto in presentation matches it). */
export interface CreateUserInput {
  email: string;
  password: string;
  firstname: string;
  lastname: string;
  username: string;
}

/** Input of a user update (UpdateUserDto); passwords change through their own flow (M11 review). */
export type UpdateUserInput = Partial<Omit<CreateUserInput, "password">>;
