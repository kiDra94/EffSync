import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import { PrismaUnitOfWork } from "../../../shared/infrastructure/prisma/prisma-unit-of-work";
import { PrismaNoteRepository } from "../infrastructure/persistence/prisma-note.repository";
import { NotesService } from "./notes.service";

describe("NotesService", () => {
  let service: NotesService;

  const prisma = {
    $transaction: jest.fn(),
    notes: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    subjects: {
      findUnique: jest.fn(),
    },
    tasks: {
      findUnique: jest.fn(),
    },
    priorities: {
      findFirst: jest.fn(),
    },
    // M19: a note's links are deleted before the note
    note_documents: { deleteMany: jest.fn() },
    notes_users: { deleteMany: jest.fn() },
  };

  prisma.$transaction.mockImplementation((callback: (tx: unknown) => unknown) =>
    Promise.resolve(callback(prisma)),
  );

  beforeEach(() => {
    jest.clearAllMocks();
    const unitOfWork = new PrismaUnitOfWork(prisma as unknown as PrismaService);
    service = new NotesService(
      new PrismaNoteRepository(unitOfWork),
      unitOfWork,
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a subject-bound note without task_id", async () => {
      prisma.subjects.findUnique.mockResolvedValue({
        subject_id: 3,
        name: "Math",
      });
      prisma.priorities.findFirst.mockResolvedValue({
        priority_id: 2,
        name: "Normal",
      });
      prisma.notes.create.mockResolvedValue({
        note_id: 11,
        title: "Sticky",
        description: "Body",
        created_by: 7,
        subject_id: 3,
        priorities: { priority_id: 2, name: "Normal" },
      });

      const result = await service.create(
        {
          title: "Sticky",
          description: "Body",
          subject_id: 3,
          priority: "medium",
        },
        7,
      );

      expect(prisma.notes.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: "Sticky",
            description: "Body",
            subject_id: 3,
            created_by: 7,
            priority_id: 2,
          }) as unknown,
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({ note_id: 11, priority: "medium" }),
      );
    });

    it("should throw NotFoundException when subject does not exist", async () => {
      prisma.subjects.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          { title: "Sticky", description: "Body", subject_id: 999 },
          1,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("findOne", () => {
    it("should return note for owner", async () => {
      prisma.notes.findFirst.mockResolvedValue({
        note_id: 1,
        title: "A",
        description: "B",
        created_by: 5,
        priorities: { name: "Hoch" },
      });

      const note = await service.findOne(1, 5);
      expect(note).toEqual(
        expect.objectContaining({ note_id: 1, priority: "high" }),
      );
    });

    it("should throw NotFoundException for non-owner", async () => {
      prisma.notes.findFirst.mockResolvedValue(null);
      await expect(service.findOne(1, 99)).rejects.toThrow(NotFoundException);
    });
  });

  // M19: the include named `tasks`, a relation notes don't have, so every
  // read with relations failed at runtime
  it("reads a note with its author, subject and priority only", async () => {
    prisma.notes.findMany.mockResolvedValue([]);

    await service.findAll(42);

    const [args] = prisma.notes.findMany.mock.calls[0] as [
      { include: Record<string, unknown> },
    ];
    expect(Object.keys(args.include).sort()).toEqual([
      "priorities",
      "subjects",
      "users",
    ]);
  });

  describe("findAll", () => {
    it("should query only notes of current creator", async () => {
      prisma.notes.findMany.mockResolvedValue([]);

      await service.findAll(42);

      expect(prisma.notes.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ created_by: 42 }) as unknown,
        }),
      );
    });
  });

  describe("update/remove", () => {
    it("should update note when owner", async () => {
      prisma.notes.findFirst.mockResolvedValue({
        note_id: 1,
        created_by: 5,
        priorities: { name: "Normal" },
      });
      prisma.priorities.findFirst.mockResolvedValue({
        priority_id: 3,
        name: "Wichtig",
      });
      prisma.notes.update.mockResolvedValue({
        note_id: 1,
        title: "Updated",
        description: "Updated Desc",
        created_by: 5,
        subject_id: 2,
        priorities: { name: "Wichtig" },
      });
      prisma.subjects.findUnique.mockResolvedValue({ subject_id: 2 });

      const updated = await service.update(1, 5, {
        title: "Updated",
        description: "Updated Desc",
        subject_id: 2,
        priority: "high",
      });

      expect(prisma.notes.update).toHaveBeenCalled();
      expect(updated).toEqual(
        expect.objectContaining({ note_id: 1, priority: "high" }),
      );
    });

    it("should delete note when owner", async () => {
      prisma.notes.findFirst.mockResolvedValue({ note_id: 1, created_by: 5 });
      prisma.notes.delete.mockResolvedValue({ note_id: 1 });

      const res = await service.remove(1, 5);
      expect(prisma.notes.delete).toHaveBeenCalledWith({
        where: { note_id: 1 },
      });
      expect(res).toEqual({ message: "Note deleted successfully", note_id: 1 });
    });

    // M19: the foreign keys of note_documents and notes_users are NoAction,
    // so a note with a document or a share couldn't be deleted
    it("deletes the note's document links and shares first, in one transaction", async () => {
      prisma.notes.findFirst.mockResolvedValue({ note_id: 1, created_by: 5 });

      await service.remove(1, 5);

      const where = { where: { note_id: 1 } };
      expect(prisma.note_documents.deleteMany).toHaveBeenCalledWith(where);
      expect(prisma.notes_users.deleteMany).toHaveBeenCalledWith(where);
      expect(
        prisma.notes_users.deleteMany.mock.invocationCallOrder[0],
      ).toBeLessThan(prisma.notes.delete.mock.invocationCallOrder[0]);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });
});
