/**
 * Characterization tests for DocumentsService (GOALS.md M1).
 *
 * They pin the current access rules, grading and deletion behavior before the
 * refactor. Known quirks are marked `// BUG (...)` or `// DECISION: ...` with
 * the milestone that changes them.
 */
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { DocumentsService } from "./documents.service";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

function createPrismaMock() {
  const prisma = {
    documents: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    users: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    user_roles: { findMany: jest.fn().mockResolvedValue([]) },
    tasks: { findUnique: jest.fn().mockResolvedValue(null), update: jest.fn() },
    task_members: { findMany: jest.fn().mockResolvedValue([]) },
    task_documents: {
      create: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(null),
      deleteMany: jest.fn(),
    },
    note_documents: { deleteMany: jest.fn() },
    document_shares: { deleteMany: jest.fn() },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(
    (callback: (tx: typeof prisma) => unknown) => callback(prisma),
  );
  return prisma;
}

type Doc = {
  document_id: number;
  name?: string;
  added_by: number;
  file_blob?: Uint8Array | null;
  file_path?: string | null;
  graded_at?: Date | null;
  grade?: string | null;
  users?: unknown;
  document_shares?: Array<{ user_id: number }>;
  task_documents?: Array<{
    task_id: number;
    tasks?: { task_id: number; created_by: number };
  }>;
  graded_by_user?: unknown;
};

const studentUploader = (userId: number) => ({
  user_id: userId,
  firstname: "Lisa",
  lastname: "Schüler",
  username: "lisa",
  students: { student_id: userId },
  user_roles: [{ roles: { name: "Student" } }],
});

const teacherUploader = (userId: number) => ({
  user_id: userId,
  firstname: "Anna",
  lastname: "Lehrer",
  username: "anna",
  students: null,
  user_roles: [{ roles: { name: "Teacher" } }],
});

const doc = (overrides: Partial<Doc> = {}): Doc => ({
  document_id: 1,
  name: "abgabe.pdf",
  added_by: 21,
  file_blob: Uint8Array.from([1, 2, 3]),
  file_path: null,
  graded_at: null,
  users: studentUploader(21),
  document_shares: [],
  task_documents: [],
  graded_by_user: null,
  ...overrides,
});

const pdfFile = (overrides: Partial<Express.Multer.File> = {}) =>
  ({
    originalname: "abgabe.pdf",
    buffer: Buffer.from("%PDF-1.4"),
    size: 8,
    mimetype: "application/pdf",
    ...overrides,
  }) as Express.Multer.File;

describe("DocumentsService (characterization, M1)", () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let notifications: { create: jest.Mock };
  let service: DocumentsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    notifications = { create: jest.fn() };
    service = new DocumentsService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
    );
  });

  const findManyWhere = () =>
    (prisma.documents.findMany.mock.calls[0][0] as { where: unknown }).where;

  describe("findAll access rules", () => {
    it("lets a teacher read every document", async () => {
      prisma.users.findUnique.mockResolvedValue(teacherUploader(4));
      prisma.documents.findMany.mockResolvedValue([
        doc(),
        doc({ document_id: 2, added_by: 30 }),
      ]);

      const result = await service.findAll(4, "teacher");

      expect(findManyWhere()).toBeUndefined();
      expect(result).toHaveLength(2);
    });

    it("limits a student to own and shared documents, and filters again in memory", async () => {
      prisma.documents.findMany.mockResolvedValue([
        doc({ document_id: 1, added_by: 21 }),
        doc({
          document_id: 2,
          added_by: 30,
          document_shares: [{ user_id: 21 }],
        }),
        doc({ document_id: 3, added_by: 30 }),
      ]);

      const result = await service.findAll(21, "student");

      expect(findManyWhere()).toEqual({
        OR: [{ added_by: 21 }, { document_shares: { some: { user_id: 21 } } }],
      });
      expect(result.map((entry) => entry.document_id)).toEqual([1, 2]);
    });

    it("treats a user without a role claim but with a student profile as a student", async () => {
      prisma.users.findUnique.mockResolvedValue({
        students: { student_id: 21 },
        user_roles: [],
      });

      await service.findAll(21);

      expect(findManyWhere()).toEqual({
        OR: [{ added_by: 21 }, { document_shares: { some: { user_id: 21 } } }],
      });
    });

    it("lets a user read everything when the DB gives them a teacher role, even without a role claim", async () => {
      prisma.users.findUnique.mockResolvedValue(teacherUploader(4));

      await service.findAll(4);

      expect(findManyWhere()).toBeUndefined();
    });

    it("gives other users their own, shared, task-linked and note-linked documents", async () => {
      prisma.users.findUnique.mockResolvedValue({
        students: null,
        user_roles: [],
      });

      await service.findAll(8, "guest");

      expect(findManyWhere()).toEqual({
        OR: [
          { added_by: 8 },
          { document_shares: { some: { user_id: 8 } } },
          {
            task_documents: {
              some: { tasks: { OR: [{ assigned_to: 8 }, { created_by: 8 }] } },
            },
          },
          {
            note_documents: {
              some: {
                notes: {
                  OR: [
                    { created_by: 8 },
                    { notes_users: { some: { user_id: 8 } } },
                  ],
                },
              },
            },
          },
        ],
      });
    });

    // DECISION: Q10 – the German role aliases are removed in M7
    it('maps the German role alias "Lehrer" to teacher', async () => {
      prisma.users.findUnique.mockResolvedValue({
        students: null,
        user_roles: [],
      });

      await service.findAll(4, "Lehrer");

      expect(findManyWhere()).toBeUndefined();
    });
  });

  describe("findOne", () => {
    it("throws 404 for an unknown document", async () => {
      prisma.documents.findUnique.mockResolvedValue(null);
      await expect(service.findOne("1", 4, "teacher")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("rejects a student reading someone else's unshared document with 403", async () => {
      prisma.documents.findUnique.mockResolvedValue(doc({ added_by: 30 }));
      prisma.documents.count.mockResolvedValue(0);

      await expect(service.findOne("1", 21, "student")).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.documents.count).toHaveBeenCalledWith({
        where: {
          document_id: 1,
          OR: [
            { added_by: 21 },
            { document_shares: { some: { user_id: 21 } } },
          ],
        },
      });
    });

    it("lets a student read an own document and never returns the blob or the share list", async () => {
      prisma.documents.findUnique.mockResolvedValue(
        doc({
          document_shares: [{ user_id: 5 }],
          task_documents: [
            { task_id: 7, tasks: { task_id: 7, created_by: 4 } },
          ],
        }),
      );
      prisma.documents.count.mockResolvedValue(1);

      const result = await service.findOne("1", 21, "student");

      expect(result).not.toHaveProperty("file_blob");
      expect(result).not.toHaveProperty("document_shares");
      expect(result.uploader).toEqual(
        expect.objectContaining({ full_name: "Lisa Schüler", role: "student" }),
      );
      expect(result.linked_task_ids).toEqual([7]);
      expect(result.primary_task_id).toBe(7);
      expect(result.permissions).toEqual({
        can_view: true,
        can_download: true,
        can_edit: true,
        can_delete: true,
        can_grade: false,
        can_resubmit: false,
      });
    });

    it("returns 403 for a non-teacher when the document vanished between the two reads", async () => {
      prisma.users.findUnique.mockResolvedValue({
        students: null,
        user_roles: [],
      });
      prisma.documents.findUnique
        .mockResolvedValueOnce(doc())
        .mockResolvedValueOnce(null);

      await expect(service.findOne("1", 8, "guest")).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("create", () => {
    it("rejects an empty upload", async () => {
      await expect(
        service.create(
          pdfFile({ buffer: Buffer.alloc(0) }),
          21,
          "application/pdf",
          "student",
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects a file extension that is not allowed", async () => {
      await expect(
        service.create(
          pdfFile({ originalname: "virus.exe" }),
          21,
          "application/octet-stream",
          "student",
        ),
      ).rejects.toThrow("Dateiformat nicht erlaubt");
    });

    it("throws 404 when the task to link does not exist", async () => {
      await expect(
        service.create(pdfFile(), 21, "application/pdf", "student", 7),
      ).rejects.toThrow(NotFoundException);
    });

    it("rejects linking to a task the student neither owns, is assigned to nor is a member of", async () => {
      prisma.tasks.findUnique.mockResolvedValue({
        task_id: 7,
        created_by: 4,
        assigned_to: 5,
        task_members: [],
      });

      await expect(
        service.create(pdfFile(), 21, "application/pdf", "student", 7),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.documents.create).not.toHaveBeenCalled();
    });

    it("stores the blob with the detected MIME type and links a task member upload in one transaction", async () => {
      prisma.tasks.findUnique.mockResolvedValue({
        task_id: 7,
        created_by: 4,
        assigned_to: null,
        task_members: [{ user_id: 21 }],
      });
      prisma.documents.create.mockResolvedValue({ document_id: 12 });
      prisma.documents.findUnique.mockResolvedValue(doc({ document_id: 12 }));

      await service.create(pdfFile(), 21, "text/plain", "student", 7);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.documents.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "abgabe.pdf",
          mime_type: "application/pdf",
          added_by: 21,
          file_path: null,
        }),
      });
      expect(prisma.task_documents.create).toHaveBeenCalledWith({
        data: { task_id: 7, document_id: 12 },
      });
    });

    it("does not notify teachers when a teacher uploads", async () => {
      prisma.documents.create.mockResolvedValue({ document_id: 12 });
      prisma.documents.findUnique.mockResolvedValue(
        doc({ document_id: 12, added_by: 4, users: teacherUploader(4) }),
      );

      await service.create(pdfFile(), 4, "application/pdf", "teacher");

      expect(prisma.user_roles.findMany).not.toHaveBeenCalled();
      expect(notifications.create).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("lets a teacher rename a document linked to their own task", async () => {
      prisma.documents.findUnique.mockResolvedValue(
        doc({
          task_documents: [
            { task_id: 7, tasks: { task_id: 7, created_by: 4 } },
          ],
        }),
      );
      prisma.documents.update.mockResolvedValue({ document_id: 1 });

      await service.update(1, { name: "  neu.pdf " }, 4, "teacher");

      expect(prisma.documents.update).toHaveBeenCalledWith({
        where: { document_id: 1 },
        data: { name: "neu.pdf" },
      });
    });

    it("rejects a teacher renaming a document of someone else's task", async () => {
      prisma.documents.findUnique.mockResolvedValue(
        doc({
          task_documents: [
            { task_id: 7, tasks: { task_id: 7, created_by: 9 } },
          ],
        }),
      );
      await expect(
        service.update(1, { name: "x" }, 4, "teacher"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("rejects a student renaming an own document after it was graded", async () => {
      prisma.documents.findUnique.mockResolvedValue(
        doc({ graded_at: new Date() }),
      );
      await expect(
        service.update(1, { name: "x" }, 21, "student"),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("grade", () => {
    beforeEach(() => {
      prisma.users.findUnique.mockResolvedValue(teacherUploader(4));
      prisma.documents.update.mockResolvedValue({ document_id: 1 });
    });

    it("rejects a student grading, even an own document, with 403", async () => {
      prisma.documents.findUnique.mockResolvedValue(doc());
      prisma.documents.count.mockResolvedValue(1);

      await expect(
        service.grade(1, { grade: "1" }, 21, "student"),
      ).rejects.toThrow("Nur Lehrkräfte dürfen Schülerdokumente bewerten");
    });

    it("rejects a teacher grading their own upload", async () => {
      prisma.documents.findUnique.mockResolvedValue(
        doc({ added_by: 4, users: studentUploader(4) }),
      );
      await expect(
        service.grade(1, { grade: "1" }, 4, "teacher"),
      ).rejects.toThrow("Nur Lehrkräfte dürfen Schülerdokumente bewerten");
    });

    it("rejects grading a teacher's document", async () => {
      prisma.documents.findUnique.mockResolvedValue(
        doc({ added_by: 9, users: teacherUploader(9) }),
      );
      await expect(
        service.grade(1, { grade: "1" }, 4, "teacher"),
      ).rejects.toThrow("Nur Lehrkräfte dürfen Schülerdokumente bewerten");
    });

    it("requires a grade or feedback", async () => {
      prisma.documents.findUnique.mockResolvedValue(doc());
      await expect(
        service.grade(1, { grade: "  ", feedback: "" }, 4, "teacher"),
      ).rejects.toThrow("Mindestens Note oder Feedback muss angegeben werden");
      expect(prisma.documents.update).not.toHaveBeenCalled();
    });

    it("stores trimmed feedback without a grade and notifies the student without a grade suffix", async () => {
      prisma.documents.findUnique.mockResolvedValue(doc());

      await service.grade(1, { feedback: " Bitte nachbessern " }, 4, "teacher");

      expect(prisma.documents.update).toHaveBeenCalledWith({
        where: { document_id: 1 },
        data: expect.objectContaining({
          grade: null,
          feedback: "Bitte nachbessern",
          graded_by: 4,
        }),
      });
      expect(notifications.create).toHaveBeenCalledWith({
        user_id: 21,
        type: "document_graded",
        text: 'Dein Dokument "abgabe.pdf" wurde bewertet.',
      });
      expect(prisma.tasks.findUnique).not.toHaveBeenCalled();
    });

    describe("completeTaskIfAllParticipantsGraded", () => {
      const linkedDoc = () =>
        doc({
          task_documents: [
            { task_id: 7, tasks: { task_id: 7, created_by: 4 } },
          ],
        });

      it("does nothing when the linked task no longer exists", async () => {
        prisma.documents.findUnique.mockResolvedValue(linkedDoc());

        await service.grade(1, { grade: "1" }, 4, "teacher");

        expect(prisma.task_members.findMany).not.toHaveBeenCalled();
        expect(prisma.tasks.update).not.toHaveBeenCalled();
      });

      it("does nothing when no participant is a student", async () => {
        prisma.documents.findUnique.mockResolvedValue(linkedDoc());
        prisma.tasks.findUnique.mockResolvedValue({
          task_id: 7,
          status: "OPEN",
          created_by: 4,
          assigned_to: null,
        });
        prisma.users.findMany.mockResolvedValue([
          {
            user_id: 4,
            students: null,
            user_roles: [{ roles: { name: "Teacher" } }],
          },
        ]);

        await service.grade(1, { grade: "1" }, 4, "teacher");

        expect(prisma.tasks.update).not.toHaveBeenCalled();
      });

      it("does not update a task that is already COMPLETED", async () => {
        prisma.documents.findUnique.mockResolvedValue(linkedDoc());
        prisma.tasks.findUnique.mockResolvedValue({
          task_id: 7,
          status: "COMPLETED",
          created_by: 4,
          assigned_to: 21,
        });
        prisma.users.findMany.mockResolvedValue([
          { user_id: 21, students: { student_id: 21 }, user_roles: [] },
        ]);
        prisma.documents.findMany.mockResolvedValue([{ added_by: 21 }]);

        await service.grade(1, { grade: "1" }, 4, "teacher");

        expect(prisma.tasks.update).not.toHaveBeenCalled();
      });
    });
  });

  describe("remove", () => {
    it("rejects a teacher, even for a document linked to their own task", async () => {
      prisma.documents.findUnique.mockResolvedValue(
        doc({
          task_documents: [
            { task_id: 7, tasks: { task_id: 7, created_by: 4 } },
          ],
        }),
      );
      await expect(service.remove("1", 4, "teacher")).rejects.toThrow(
        "Nur Schüler dürfen ihre eigenen Dokumente löschen",
      );
    });

    it("rejects a student deleting an own graded document", async () => {
      prisma.documents.findUnique.mockResolvedValue(
        doc({ graded_at: new Date() }),
      );
      await expect(service.remove("1", 21, "student")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("rejects a student deleting someone else's document", async () => {
      prisma.documents.findUnique.mockResolvedValue(doc({ added_by: 30 }));
      await expect(service.remove("1", 21, "student")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("lets an admin delete any document, removing shares, note and task links first", async () => {
      prisma.documents.findUnique.mockResolvedValue(
        doc({ added_by: 30, graded_at: new Date() }),
      );

      await service.remove("1", 2, "admin");

      expect(prisma.document_shares.deleteMany).toHaveBeenCalledWith({
        where: { document_id: 1 },
      });
      expect(prisma.note_documents.deleteMany).toHaveBeenCalledWith({
        where: { document_id: 1 },
      });
      expect(prisma.task_documents.deleteMany).toHaveBeenCalledWith({
        where: { document_id: 1 },
      });
      expect(prisma.documents.delete).toHaveBeenCalledWith({
        where: { document_id: 1 },
      });
    });
  });

  describe("downloads", () => {
    it("rejects a student downloading an unshared foreign document", async () => {
      prisma.documents.findUnique.mockResolvedValue(doc({ added_by: 30 }));
      await expect(
        service.getDownloadPayload(1, 21, "student"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("throws 404 when a document has neither a blob nor a file path", async () => {
      prisma.users.findUnique.mockResolvedValue(teacherUploader(4));
      prisma.documents.findUnique.mockResolvedValue(
        doc({ file_blob: null, file_path: null }),
      );
      await expect(service.getDownloadPayload(1, 4, "teacher")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws 404 when the file path points to a missing file", async () => {
      // absolute path inside a fresh empty temp dir, so the result doesn't depend on the cwd
      const emptyDir = mkdtempSync(join(tmpdir(), "m1-download-"));
      prisma.users.findUnique.mockResolvedValue(teacherUploader(4));
      prisma.documents.findUnique.mockResolvedValue(
        doc({ file_blob: null, file_path: join(emptyDir, "missing.pdf") }),
      );
      try {
        await expect(
          service.getDownloadPayload(1, 4, "teacher"),
        ).rejects.toThrow("Datei zum Dokument wurde nicht gefunden");
      } finally {
        rmSync(emptyDir, { recursive: true, force: true });
      }
    });
  });

  describe("getMyGrades", () => {
    it("maps graded documents with the first linked task", async () => {
      const gradedAt = new Date();
      prisma.documents.findMany.mockResolvedValue([
        {
          document_id: 1,
          name: "a.pdf",
          file_size: 3,
          mime_type: "application/pdf",
          grade: "2",
          feedback: "gut",
          graded_by_user: { user_id: 4 },
          graded_at: gradedAt,
          task_documents: [
            {
              task_id: 7,
              tasks: { task_id: 7, title: "Mathe", status: "OPEN" },
            },
          ],
        },
        { document_id: 2, name: "b.pdf", task_documents: [] },
      ]);

      const result = await service.getMyGrades(21);

      expect(prisma.documents.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { added_by: 21, graded_at: { not: null } },
          orderBy: { graded_at: "desc" },
        }),
      );
      expect(result[0]).toEqual(
        expect.objectContaining({
          document_id: 1,
          grade: "2",
          task_title: "Mathe",
          task_id: 7,
        }),
      );
      expect(result[1]).toEqual(
        expect.objectContaining({ task_title: null, task_id: null }),
      );
    });
  });

  describe("getDocumentsByTask", () => {
    it("throws 404 for an unknown task", async () => {
      await expect(service.getDocumentsByTask(7, 4, "teacher")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("rejects a student who did not create the task", async () => {
      prisma.tasks.findUnique.mockResolvedValue({ task_id: 7, created_by: 4 });
      await expect(
        service.getDocumentsByTask(7, 21, "student"),
      ).rejects.toThrow(ForbiddenException);
    });

    // BUG (problem 10): `users` is a single relation object, so `doc.users?.[0]` is always undefined
    it("returns the task documents with role-based permissions and no uploader", async () => {
      prisma.tasks.findUnique.mockResolvedValue({ task_id: 7, created_by: 4 });
      prisma.documents.findMany.mockResolvedValue([
        {
          document_id: 1,
          added_by: 21,
          users: { user_id: 21 },
          task_documents: [{ task_id: 7 }],
        },
      ]);

      const [entry] = await service.getDocumentsByTask(7, 4, "teacher");

      expect(entry.uploader).toBeNull();
      expect(entry.task_id).toBe(7);
      expect(entry.permissions).toEqual({
        can_download: true,
        can_grade: true,
        can_delete: false,
        can_edit: true,
      });
    });
  });

  describe("allowResubmit", () => {
    it("rejects non-teachers", async () => {
      await expect(
        service.allowResubmit(1, undefined, 21, "student"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("rejects an ungraded document", async () => {
      prisma.documents.findUnique.mockResolvedValue(doc());
      await expect(
        service.allowResubmit(1, undefined, 4, "teacher"),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws 404 when no task is linked", async () => {
      prisma.documents.findUnique.mockResolvedValue(
        doc({ graded_at: new Date() }),
      );
      await expect(
        service.allowResubmit(1, undefined, 4, "teacher"),
      ).rejects.toThrow(NotFoundException);
    });

    // BUG (M19): the task is unlocked, but locked_until is set to the new deadline,
    // so anything reading locked_until sees an unlocked task as "locked until" that date
    it("unlocks the linked task with the new deadline and notifies the student", async () => {
      const deadline = new Date("2026-12-24T10:00:00Z");
      prisma.documents.findUnique.mockResolvedValue(
        doc({ graded_at: new Date() }),
      );
      prisma.task_documents.findFirst.mockResolvedValue({
        tasks: { task_id: 7, title: "Mathe", deadline: null },
      });

      const result = await service.allowResubmit(1, deadline, 4, "teacher");

      expect(prisma.tasks.update).toHaveBeenCalledWith({
        where: { task_id: 7 },
        data: {
          is_locked: false,
          locked_reason: null,
          locked_until: deadline,
          deadline,
        },
      });
      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 21, type: "RESUBMIT_ALLOWED" }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          task_id: 7,
          task_title: "Mathe",
          document_id: 1,
        }),
      );
    });
  });
});
