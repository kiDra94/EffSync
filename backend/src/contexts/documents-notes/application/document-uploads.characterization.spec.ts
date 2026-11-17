/**
 * Characterization tests for DocumentUploadsService (GOALS.md M1; DocumentsService until
 * M19, split by use case there).
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
import {
  createDocumentServices,
  createPrismaMock,
  doc,
  pdfFile,
  teacherUploader,
} from "./documents.fixtures";

describe("DocumentUploadsService (characterization, M1)", () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let notifications: { create: jest.Mock };
  let uploads: ReturnType<typeof createDocumentServices>["uploads"];

  beforeEach(() => {
    prisma = createPrismaMock();
    notifications = { create: jest.fn() };
    uploads = createDocumentServices(prisma, notifications).uploads;
  });

  describe("create", () => {
    it("rejects an empty upload", async () => {
      await expect(
        uploads.create(
          pdfFile({ buffer: Buffer.alloc(0) }),
          21,
          "application/pdf",
          "student",
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects a file extension that is not allowed", async () => {
      await expect(
        uploads.create(
          pdfFile({ originalname: "virus.exe" }),
          21,
          "application/octet-stream",
          "student",
        ),
      ).rejects.toThrow("Dateiformat nicht erlaubt");
    });

    it("throws 404 when the task to link does not exist", async () => {
      await expect(
        uploads.create(pdfFile(), 21, "application/pdf", "student", 7),
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
        uploads.create(pdfFile(), 21, "application/pdf", "student", 7),
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

      await uploads.create(pdfFile(), 21, "text/plain", "student", 7);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.documents.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "abgabe.pdf",
          mime_type: "application/pdf",
          added_by: 21,
          file_path: null,
        }) as unknown,
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

      await uploads.create(pdfFile(), 4, "application/pdf", "teacher");

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

      await uploads.update(1, { name: "  neu.pdf " }, 4, "teacher");

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
        uploads.update(1, { name: "x" }, 4, "teacher"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("rejects a student renaming an own document after it was graded", async () => {
      prisma.documents.findUnique.mockResolvedValue(
        doc({ graded_at: new Date() }),
      );
      await expect(
        uploads.update(1, { name: "x" }, 21, "student"),
      ).rejects.toThrow(ForbiddenException);
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
      await expect(uploads.remove("1", 4, "teacher")).rejects.toThrow(
        "Nur Schüler dürfen ihre eigenen Dokumente löschen",
      );
    });

    it("rejects a student deleting an own graded document", async () => {
      prisma.documents.findUnique.mockResolvedValue(
        doc({ graded_at: new Date() }),
      );
      await expect(uploads.remove("1", 21, "student")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("rejects a student deleting someone else's document", async () => {
      prisma.documents.findUnique.mockResolvedValue(doc({ added_by: 30 }));
      await expect(uploads.remove("1", 21, "student")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("lets an admin delete any document, removing shares, note and task links first", async () => {
      prisma.documents.findUnique.mockResolvedValue(
        doc({ added_by: 30, graded_at: new Date() }),
      );

      await uploads.remove("1", 2, "admin");

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
});
