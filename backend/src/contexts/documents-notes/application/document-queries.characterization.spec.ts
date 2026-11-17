/**
 * Characterization tests for DocumentQueriesService (GOALS.md M1; DocumentsService until
 * M19, split by use case there).
 *
 * They pin the current access rules, grading and deletion behavior before the
 * refactor. Known quirks are marked `// BUG (...)` or `// DECISION: ...` with
 * the milestone that changes them.
 */
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  createDocumentServices,
  createPrismaMock,
  doc,
  teacherUploader,
} from "./documents.fixtures";

describe("DocumentQueriesService (characterization, M1)", () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let notifications: { create: jest.Mock };
  let queries: ReturnType<typeof createDocumentServices>["queries"];

  beforeEach(() => {
    prisma = createPrismaMock();
    notifications = { create: jest.fn() };
    queries = createDocumentServices(prisma, notifications).queries;
  });

  const findManyWhere = () =>
    (prisma.documents.findMany.mock.calls as [{ where: unknown }][])[0][0]
      .where;

  describe("findAll access rules", () => {
    it("lets a teacher read every document", async () => {
      prisma.users.findUnique.mockResolvedValue(teacherUploader(4));
      prisma.documents.findMany.mockResolvedValue([
        doc(),
        doc({ document_id: 2, added_by: 30 }),
      ]);

      const result = await queries.findAll(4, "teacher");

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

      const result = await queries.findAll(21, "student");

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

      await queries.findAll(21);

      expect(findManyWhere()).toEqual({
        OR: [{ added_by: 21 }, { document_shares: { some: { user_id: 21 } } }],
      });
    });

    it("lets a user read everything when the DB gives them a teacher role, even without a role claim", async () => {
      prisma.users.findUnique.mockResolvedValue(teacherUploader(4));

      await queries.findAll(4);

      expect(findManyWhere()).toBeUndefined();
    });

    it("gives other users their own, shared, task-linked and note-linked documents", async () => {
      prisma.users.findUnique.mockResolvedValue({
        students: null,
        user_roles: [],
      });

      await queries.findAll(8, "guest");

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

    // DECISION: Q10 (applied in M7) – German role aliases are gone; only RoleName counts
    it('no longer treats the German alias "Lehrer" as a teacher', async () => {
      prisma.users.findUnique.mockResolvedValue({
        students: null,
        user_roles: [],
      });

      await queries.findAll(4, "Lehrer");

      expect(findManyWhere()).toBeDefined();
    });

    it("still accepts the English role name in any case", async () => {
      prisma.users.findUnique.mockResolvedValue({
        students: null,
        user_roles: [],
      });

      await queries.findAll(4, "Teacher");

      expect(findManyWhere()).toBeUndefined();
    });
  });

  describe("findOne", () => {
    it("throws 404 for an unknown document", async () => {
      prisma.documents.findUnique.mockResolvedValue(null);
      await expect(queries.findOne("1", 4, "teacher")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("rejects a student reading someone else's unshared document with 403", async () => {
      prisma.documents.findUnique.mockResolvedValue(doc({ added_by: 30 }));
      prisma.documents.count.mockResolvedValue(0);

      await expect(queries.findOne("1", 21, "student")).rejects.toThrow(
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

      const result = await queries.findOne("1", 21, "student");

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

      await expect(queries.findOne("1", 8, "guest")).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("downloads", () => {
    it("rejects a student downloading an unshared foreign document", async () => {
      prisma.documents.findUnique.mockResolvedValue(doc({ added_by: 30 }));
      await expect(
        queries.getDownloadPayload(1, 21, "student"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("throws 404 when a document has neither a blob nor a file path", async () => {
      prisma.users.findUnique.mockResolvedValue(teacherUploader(4));
      prisma.documents.findUnique.mockResolvedValue(
        doc({ file_blob: null, file_path: null }),
      );
      await expect(queries.getDownloadPayload(1, 4, "teacher")).rejects.toThrow(
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
          queries.getDownloadPayload(1, 4, "teacher"),
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

      const result = await queries.getMyGrades(21);

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
      await expect(queries.getDocumentsByTask(7, 4, "teacher")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("rejects a student who did not create the task", async () => {
      prisma.tasks.findUnique.mockResolvedValue({ task_id: 7, created_by: 4 });
      await expect(
        queries.getDocumentsByTask(7, 21, "student"),
      ).rejects.toThrow(ForbiddenException);
    });

    // fixed in M19 (problem 10): `users` is a single relation object, so
    // `doc.users?.[0]` was always undefined and the uploader null
    it("returns the task documents with role-based permissions and their uploader", async () => {
      prisma.tasks.findUnique.mockResolvedValue({ task_id: 7, created_by: 4 });
      prisma.documents.findMany.mockResolvedValue([
        {
          document_id: 1,
          added_by: 21,
          users: { user_id: 21 },
          task_documents: [{ task_id: 7 }],
        },
      ]);

      const [entry] = await queries.getDocumentsByTask(7, 4, "teacher");

      expect(entry.uploader).toEqual({ user_id: 21 });
      expect(entry.task_id).toBe(7);
      expect(entry.permissions).toEqual({
        can_download: true,
        can_grade: true,
        can_delete: false,
        can_edit: true,
      });
    });
  });
});
