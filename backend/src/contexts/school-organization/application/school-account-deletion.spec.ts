import { ConflictException } from "@nestjs/common";
import { AccountDeletionRegistry } from "../../identity-access/application";
import { PrismaUnitOfWork } from "../../../shared/infrastructure/prisma/prisma-unit-of-work";
import { PrismaSchoolProfileRepository } from "../infrastructure/persistence/prisma-school-profile.repository";
import { SchoolAccountDeletion } from "./school-account-deletion";

// T10, decision H1 (M14), moved here in M22: school-organization's part of
// an account deletion, in identity-access's unit of work
describe("SchoolAccountDeletion", () => {
  const table = () => ({ updateMany: jest.fn(), deleteMany: jest.fn() });
  const count = (value = 0) => ({ count: jest.fn().mockResolvedValue(value) });
  let tx: {
    $queryRaw: jest.Mock;
    teachers: ReturnType<typeof table>;
    students: ReturnType<typeof table>;
    classes: ReturnType<typeof count>;
    classes_teachers: ReturnType<typeof count>;
    lesson_slots: ReturnType<typeof count>;
  };
  let registry: AccountDeletionRegistry;

  beforeEach(() => {
    tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      teachers: table(),
      students: table(),
      classes: count(),
      classes_teachers: count(),
      lesson_slots: count(),
    };
    registry = new AccountDeletionRegistry();
    new SchoolAccountDeletion(
      new PrismaSchoolProfileRepository({
        client: () => tx,
      } as unknown as PrismaUnitOfWork),
      registry,
    ).onModuleInit();
  });

  // decision H1: a teacher still assigned blocks the deletion (409)
  it.each(["classes", "classes_teachers", "lesson_slots"] as const)(
    "refuses while the teacher is still referenced by %s",
    async (name) => {
      tx[name].count.mockResolvedValue(1);

      await expect(registry.assertDeletable(5)).rejects.toThrow(
        ConflictException,
      );
    },
  );

  // review M14 (5): the teacher row is locked against concurrent assignments
  it("locks the teacher row before counting", async () => {
    await registry.assertDeletable(5);

    const [strings] = tx.$queryRaw.mock.calls[0] as [TemplateStringsArray];
    expect(strings.join("?")).toMatch(/FROM "teachers".*FOR UPDATE/);
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.classes.count.mock.invocationCallOrder[0],
    );
  });

  it("clears supervisor references and deletes the profiles", async () => {
    await registry.anonymizeUser(5);

    expect(tx.teachers.updateMany).toHaveBeenCalledWith({
      where: { supervisor_id: 5 },
      data: { supervisor_id: null },
    });
    expect(tx.students.deleteMany).toHaveBeenCalledWith({
      where: { student_id: 5 },
    });
    expect(tx.teachers.deleteMany).toHaveBeenCalledWith({
      where: { teacher_id: 5 },
    });
  });
});
