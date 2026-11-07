import { ConflictException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import { UserRepository } from "./ports/user.repository";

// M13 step 5 (found in M11): Google sign-in looks the account up by google_id,
// then by e-mail, and creates users with the same default role as register
describe("AuthService.signInWithGoogle", () => {
  const withRoles = (user_id: number, role = "Teacher") => ({
    user_id,
    username: "anna",
    email: "anna@htl.at",
    google_id: "g-1",
    user_roles: [{ roles: { name: role } }],
  });
  const profile = {
    googleId: "g-1",
    email: "anna@htl.at",
    emailVerified: true,
    firstname: "Anna",
    lastname: "Lehrerin",
  };

  let users: Record<string, jest.Mock>;
  let service: AuthService;

  beforeEach(() => {
    users = {
      findByGoogleIdWithRoles: jest.fn().mockResolvedValue(null),
      findByEmailWithRoles: jest.fn().mockResolvedValue(null),
      findByIdWithRoles: jest.fn(),
      findByEmail: jest.fn().mockResolvedValue(null),
      findByUsername: jest.fn().mockResolvedValue(null),
      linkGoogleId: jest.fn().mockResolvedValue(undefined),
      create: jest.fn().mockResolvedValue({ user_id: 30 }),
      findRoleByName: jest.fn().mockResolvedValue({ role_id: 2 }),
      assignRole: jest.fn().mockResolvedValue(undefined),
    };
    service = new AuthService(
      users as unknown as UserRepository,
      {} as JwtService,
    );
  });

  it("signs in the account that is linked to the Google id", async () => {
    users.findByGoogleIdWithRoles.mockResolvedValue(withRoles(4));

    await expect(service.signInWithGoogle(profile)).resolves.toEqual({
      userId: 4,
      username: "anna",
      role: "teacher",
    });
    expect(users.create).not.toHaveBeenCalled();
  });

  it("links a local account with the same verified e-mail instead of creating a second one", async () => {
    users.findByEmailWithRoles.mockResolvedValue({
      ...withRoles(2),
      google_id: null,
    });

    const result = await service.signInWithGoogle(profile);

    expect(users.findByEmailWithRoles).toHaveBeenCalledWith("anna@htl.at");
    expect(users.linkGoogleId).toHaveBeenCalledWith(2, "g-1");
    expect(users.create).not.toHaveBeenCalled();
    expect(result.userId).toBe(2);
  });

  it("doesn't link by an unverified e-mail address", async () => {
    users.findByIdWithRoles.mockResolvedValue(withRoles(30, "Student"));

    await service.signInWithGoogle({ ...profile, emailVerified: false });

    expect(users.findByEmailWithRoles).not.toHaveBeenCalled();
    expect(users.create).toHaveBeenCalledTimes(1);
  });

  it("creates a new user with the Student role, like register", async () => {
    users.findByIdWithRoles.mockResolvedValue(withRoles(30, "Student"));

    const result = await service.signInWithGoogle(profile);

    expect(users.create).toHaveBeenCalledWith({
      username: "anna@htl.at",
      email: "anna@htl.at",
      firstname: "Anna",
      lastname: "Lehrerin",
      password_hash: null,
      google_id: "g-1",
    });
    expect(users.findRoleByName).toHaveBeenCalledWith("Student");
    expect(users.assignRole).toHaveBeenCalledWith(30, 2);
    expect(result).toEqual({ userId: 30, username: "anna", role: "student" });
  });

  it("falls back to placeholders when Google sends no e-mail or name", async () => {
    users.findByIdWithRoles.mockResolvedValue(withRoles(30, "Student"));

    await service.signInWithGoogle({ googleId: "g-2", emailVerified: false });

    expect(users.create).toHaveBeenCalledWith(
      expect.objectContaining({
        username: "g-2@google.oauth",
        email: "g-2@google.oauth",
        firstname: "Google",
        lastname: "User",
      }),
    );
  });

  // review M13 (2): a collision ends in 409 instead of a unique-constraint 500
  it("answers 409 when an unverified Google e-mail belongs to another account", async () => {
    users.findByEmail = jest.fn().mockResolvedValue({ user_id: 2 });
    users.findByUsername = jest.fn().mockResolvedValue(null);

    await expect(
      service.signInWithGoogle({ ...profile, emailVerified: false }),
    ).rejects.toThrow(ConflictException);
    expect(users.create).not.toHaveBeenCalled();
  });

  it("answers 409 when the e-mail is another account's username", async () => {
    users.findByEmail = jest.fn().mockResolvedValue(null);
    users.findByUsername = jest.fn().mockResolvedValue({ user_id: 5 });

    await expect(service.signInWithGoogle(profile)).rejects.toThrow(
      ConflictException,
    );
    expect(users.create).not.toHaveBeenCalled();
  });

  // review M13 (4): never move an account from one Google id to another
  it("doesn't relink an account that is linked to a different Google id", async () => {
    users.findByEmailWithRoles.mockResolvedValue(withRoles(2));

    await expect(
      service.signInWithGoogle({ ...profile, googleId: "g-other" }),
    ).rejects.toThrow(ConflictException);
    expect(users.linkGoogleId).not.toHaveBeenCalled();
  });
});
