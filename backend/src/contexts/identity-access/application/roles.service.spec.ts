import { BadRequestException, NotFoundException } from "@nestjs/common";
import { RoleRepository } from "./ports/access.repositories";
import { RolesService } from "./roles.service";

// M35 (T77, decisions Q18, I2): the Superuser sets a role's permissions
describe("RolesService.setPermissions", () => {
  const findAll = jest.fn();
  const findOne = jest.fn();
  const findPermissionsByIds = jest.fn();
  const replacePermissions = jest.fn();
  let service: RolesService;

  const known = [
    { permission_id: 1, name: "view_dashboard", flags: 4 },
    { permission_id: 9, name: "manage_system", flags: 6 },
  ];

  beforeEach(() => {
    jest.resetAllMocks();
    const roles: RoleRepository = {
      findAll,
      findOne,
      findPermissionsByIds,
      replacePermissions,
    };
    service = new RolesService(roles);
    findOne.mockResolvedValue({ role_id: 2, name: "Student" });
    findPermissionsByIds.mockImplementation((ids: number[]) =>
      Promise.resolve(known.filter((p) => ids.includes(p.permission_id))),
    );
  });

  it("replaces the role's permissions and flags and returns the role", async () => {
    const entries = [{ permission_id: 1, flags: 4 }];

    await service.setPermissions(2, entries);

    expect(replacePermissions).toHaveBeenCalledWith(2, entries);
    expect(findOne).toHaveBeenCalledTimes(2);
  });

  // review M35: without flags, a permission keeps its own, also for the guard
  it("checks the lock-out with the permission's own flags where none are sent", async () => {
    findOne.mockResolvedValue({ role_id: 1, name: "Superuser" });
    findPermissionsByIds.mockResolvedValue([
      { permission_id: 1, name: "view_dashboard", flags: 4 },
      { permission_id: 3, name: "manage_users", flags: 4 },
      { permission_id: 9, name: "manage_system", flags: 6 },
    ]);
    const entries = [
      { permission_id: 1 },
      { permission_id: 3 },
      { permission_id: 9 },
    ];

    await service.setPermissions(1, entries);

    expect(replacePermissions).toHaveBeenCalledWith(1, entries);
  });

  it("answers 404 for an unknown role", async () => {
    findOne.mockResolvedValue(null);
    await expect(service.setPermissions(99, [])).rejects.toThrow(
      NotFoundException,
    );
  });

  it("rejects an unknown or repeated permission", async () => {
    await expect(
      service.setPermissions(2, [{ permission_id: 404, flags: 4 }]),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.setPermissions(2, [
        { permission_id: 1, flags: 4 },
        { permission_id: 1, flags: 6 },
      ]),
    ).rejects.toThrow(BadRequestException);
    expect(replacePermissions).not.toHaveBeenCalled();
  });

  it("refuses to lock the Superuser out", async () => {
    findOne.mockResolvedValue({ role_id: 1, name: "Superuser" });
    await expect(
      service.setPermissions(1, [{ permission_id: 1, flags: 7 }]),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.setPermissions(1, [{ permission_id: 9, flags: 4 }]),
    ).rejects.toThrow(BadRequestException);
    expect(replacePermissions).not.toHaveBeenCalled();
  });
});
