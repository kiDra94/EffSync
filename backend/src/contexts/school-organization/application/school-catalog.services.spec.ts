import { ConflictException, NotFoundException } from "@nestjs/common";
import { DepartmentsService } from "./departments.service";
import { RoomsService } from "./room.service";
import { SubjectsService } from "./subjects.service";

// T26, decision D1 (M36): departments, subjects and rooms on the real API
describe.each([
  ["DepartmentsService", DepartmentsService, "department_id"],
  ["SubjectsService", SubjectsService, "subject_id"],
  ["RoomsService", RoomsService, "room_id"],
] as const)("%s", (_name, Service, key) => {
  let repository: Record<string, jest.Mock>;
  let service: InstanceType<typeof Service>;

  beforeEach(() => {
    repository = {
      findAll: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue({ [key]: 3, name: "X" }),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn().mockResolvedValue(true),
    };
    service = new Service(repository as never);
  });

  it("creates, changes and deletes", async () => {
    await service.create({ name: "Neu" });
    await service.update(3, { name: "Anders" });

    await expect(service.remove(3)).resolves.toMatchObject({ [key]: 3 });
    expect(repository.create).toHaveBeenCalledWith({ name: "Neu" });
    expect(repository.update).toHaveBeenCalledWith(3, { name: "Anders" });
  });

  it("answers 404 for a missing entry", async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findOne(9)).rejects.toThrow(NotFoundException);
    await expect(service.update(9, {})).rejects.toThrow(NotFoundException);
    await expect(service.remove(9)).rejects.toThrow(NotFoundException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("answers 409 while the entry is still in use", async () => {
    repository.delete.mockResolvedValue(false);

    await expect(service.remove(3)).rejects.toThrow(ConflictException);
  });
});
