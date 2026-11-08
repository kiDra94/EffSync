import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { UserRepository } from "./ports/user.repository";
import { RolePermissionsService } from "./role-permissions.service";
import { UnitOfWork } from "../../../shared/application/unit-of-work";
import type { Transaction } from "../../../shared/domain/transaction";
import { AccountDeletionRegistry } from "./account-deletion";

// T10, decision H1 (M14): the rules around deleting an account
describe("UsersService.remove", () => {
  const ADMIN = 1;
  let users: Record<string, jest.Mock>;
  let unitOfWork: { run: jest.Mock };
  let accountDeletion: { assertDeletable: jest.Mock; anonymizeUser: jest.Mock };
  let service: UsersService;

  beforeEach(() => {
    users = {
      lockForDeletion: jest.fn().mockResolvedValue({ user_id: 4 }),
      findRolesWithPermissions: jest
        .fn()
        .mockResolvedValue([{ role_id: 2, roles: { name: "Student" } }]),
      countUsersWithRole: jest.fn().mockResolvedValue(1),
      anonymizeAndDelete: jest.fn().mockResolvedValue({
        user_id: 4,
        username: "ffuchs",
        password_hash: "h",
      }),
      findById: jest.fn(),
      update: jest.fn(),
    };
    accountDeletion = {
      assertDeletable: jest.fn().mockResolvedValue(undefined),
      anonymizeUser: jest.fn().mockResolvedValue(undefined),
    };
    unitOfWork = {
      run: jest.fn((work: (tx: Transaction) => Promise<unknown>) =>
        work({} as Transaction),
      ),
    };
    service = new UsersService(
      users as unknown as UserRepository,
      {} as RolePermissionsService,
      unitOfWork as unknown as UnitOfWork,
      accountDeletion as unknown as AccountDeletionRegistry,
    );
  });

  it("locks, checks and anonymizes in one unit of work, and returns the user without the password hash", async () => {
    await expect(service.remove(4, ADMIN)).resolves.toEqual({
      user_id: 4,
      username: "ffuchs",
    });
    expect(unitOfWork.run).toHaveBeenCalledTimes(1);
    expect(users.lockForDeletion).toHaveBeenCalledWith(4);
    expect(users.anonymizeAndDelete).toHaveBeenCalledWith(4);
  });

  // M15 step 6: the other contexts' rows (tasks) go first, in the same unit of work
  it("lets the registered contexts anonymize their rows before its own", async () => {
    unitOfWork.run.mockImplementation(
      async (work: (tx: Transaction) => Promise<unknown>) => {
        const result = await work({} as Transaction);
        expect(accountDeletion.anonymizeUser).toHaveBeenCalledWith(4);
        return result;
      },
    );

    await service.remove(4, ADMIN);

    expect(
      accountDeletion.anonymizeUser.mock.invocationCallOrder[0],
    ).toBeLessThan(users.anonymizeAndDelete.mock.invocationCallOrder[0]);
  });

  it("never deletes the ghost user", async () => {
    await expect(service.remove(0, ADMIN)).rejects.toThrow(BadRequestException);
    expect(users.anonymizeAndDelete).not.toHaveBeenCalled();
  });

  // review M14 (1)
  it("doesn't let an admin delete their own account", async () => {
    await expect(service.remove(ADMIN, ADMIN)).rejects.toThrow(
      BadRequestException,
    );
    expect(users.anonymizeAndDelete).not.toHaveBeenCalled();
  });

  it("keeps the last Superuser or Admin", async () => {
    users.findRolesWithPermissions.mockResolvedValue([
      { role_id: 1, roles: { name: "Superuser" } },
    ]);
    users.countUsersWithRole.mockResolvedValue(1);

    await expect(service.remove(4, ADMIN)).rejects.toThrow(BadRequestException);
    expect(users.countUsersWithRole).toHaveBeenCalledWith(1);
    expect(users.anonymizeAndDelete).not.toHaveBeenCalled();
  });

  it("answers 404 for an unknown user", async () => {
    users.lockForDeletion.mockResolvedValue(null);

    await expect(service.remove(99, ADMIN)).rejects.toThrow(NotFoundException);
  });

  // the teacher check is school-organization's participant since M22
  // (school-account-deletion.spec.ts); a refusal stops the deletion
  it("answers 409 while a context refuses, e.g. a teacher still assigned", async () => {
    accountDeletion.assertDeletable.mockRejectedValue(new ConflictException());

    await expect(service.remove(3, ADMIN)).rejects.toThrow(ConflictException);
    expect(accountDeletion.assertDeletable).toHaveBeenCalledWith(3);
    expect(accountDeletion.anonymizeUser).not.toHaveBeenCalled();
    expect(users.anonymizeAndDelete).not.toHaveBeenCalled();
  });

  // review M14 (2): the ghost user's name stands for every deleted account
  it("doesn't change the ghost user", async () => {
    await expect(service.update(0, { firstname: "Max" })).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.addRoleToUser(0, 2)).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.addPermissionToUser(0, 3)).rejects.toThrow(
      BadRequestException,
    );
    expect(users.update).not.toHaveBeenCalled();
  });
});
