/**
 * Characterization tests for DocumentGradingService (GOALS.md M1; DocumentsService until
 * M19, split by use case there).
 *
 * They pin the current access rules, grading and deletion behavior before the
 * refactor. Known quirks are marked `// BUG (...)` or `// DECISION: ...` with
 * the milestone that changes them.
 */
import { BadRequestException, NotFoundException } from "@nestjs/common";
import {
  createDocumentServices,
  createPrismaMock,
  doc,
  studentUploader,
  teacherUploader,
} from "./documents.fixtures";

describe("DocumentGradingService (characterization, M1)", () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let notifications: { create: jest.Mock };
  let grading: ReturnType<typeof createDocumentServices>["grading"];

  beforeEach(() => {
    prisma = createPrismaMock();
    notifications = { create: jest.fn() };
    grading = createDocumentServices(prisma, notifications).grading;
  });

  describe("grade", () => {
    beforeEach(() => {
      prisma.users.findUnique.mockResolvedValue(teacherUploader(4));
      prisma.documents.update.mockResolvedValue({ document_id: 1 });
    });

    // M7: the role is checked by RolesGuard on PATCH /documents/:id/grade from the
    // DB roles (test/guard-order.e2e-spec.ts); the service no longer reads the JWT role
    it("rejects grading one's own upload, whatever the role", async () => {
      prisma.documents.findUnique.mockResolvedValue(doc());
      prisma.documents.count.mockResolvedValue(1);

      await expect(
        grading.grade(1, { grade: "1" }, 21, "student"),
      ).rejects.toThrow("Nur Lehrkräfte dürfen Schülerdokumente bewerten");
    });

    it("rejects a teacher grading their own upload", async () => {
      prisma.documents.findUnique.mockResolvedValue(
        doc({ added_by: 4, users: studentUploader(4) }),
      );
      await expect(
        grading.grade(1, { grade: "1" }, 4, "teacher"),
      ).rejects.toThrow("Nur Lehrkräfte dürfen Schülerdokumente bewerten");
    });

    it("rejects grading a teacher's document", async () => {
      prisma.documents.findUnique.mockResolvedValue(
        doc({ added_by: 9, users: teacherUploader(9) }),
      );
      await expect(
        grading.grade(1, { grade: "1" }, 4, "teacher"),
      ).rejects.toThrow("Nur Lehrkräfte dürfen Schülerdokumente bewerten");
    });

    it("requires a grade or feedback", async () => {
      prisma.documents.findUnique.mockResolvedValue(doc());
      await expect(
        grading.grade(1, { grade: "  ", feedback: "" }, 4, "teacher"),
      ).rejects.toThrow("Mindestens Note oder Feedback muss angegeben werden");
      expect(prisma.documents.update).not.toHaveBeenCalled();
    });

    it("stores trimmed feedback without a grade and notifies the student without a grade suffix", async () => {
      prisma.documents.findUnique.mockResolvedValue(doc());

      await grading.grade(1, { feedback: " Bitte nachbessern " }, 4, "teacher");

      expect(prisma.documents.update).toHaveBeenCalledWith({
        where: { document_id: 1 },
        data: expect.objectContaining({
          grade: null,
          feedback: "Bitte nachbessern",
          graded_by: 4,
        }) as unknown,
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

        await grading.grade(1, { grade: "1" }, 4, "teacher");

        expect(prisma.task_members.findMany).not.toHaveBeenCalled();
        expect(prisma.tasks.update).not.toHaveBeenCalled();
      });

      it("does nothing when no participant is a student", async () => {
        prisma.documents.findUnique.mockResolvedValue(linkedDoc());
        prisma.tasks.findMany.mockResolvedValue([
          {
            task_id: 7,
            status: "OPEN",
            created_by: 4,
            assigned_to: null,
          },
        ]);
        prisma.users.findMany.mockResolvedValue([
          {
            user_id: 4,
            students: null,
            user_roles: [{ roles: { name: "Teacher" } }],
          },
        ]);

        await grading.grade(1, { grade: "1" }, 4, "teacher");

        expect(prisma.tasks.update).not.toHaveBeenCalled();
      });

      it("does not update a task that is already COMPLETED", async () => {
        prisma.documents.findUnique.mockResolvedValue(linkedDoc());
        prisma.tasks.findMany.mockResolvedValue([
          {
            task_id: 7,
            status: "COMPLETED",
            created_by: 4,
            assigned_to: 21,
          },
        ]);
        prisma.users.findMany.mockResolvedValue([
          { user_id: 21, students: { student_id: 21 }, user_roles: [] },
        ]);
        prisma.documents.findMany.mockResolvedValue([{ added_by: 21 }]);

        await grading.grade(1, { grade: "1" }, 4, "teacher");

        expect(prisma.tasks.update).not.toHaveBeenCalled();
      });
    });
  });

  describe("allowResubmit", () => {
    // M7: the role is checked by RolesGuard on the route (DB roles), not from the JWT role
    it("no longer rejects by the JWT role; the route guard does", async () => {
      prisma.documents.findUnique.mockResolvedValue(doc());
      await expect(grading.allowResubmit(1, undefined)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("rejects an ungraded document", async () => {
      prisma.documents.findUnique.mockResolvedValue(doc());
      await expect(grading.allowResubmit(1, undefined)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("throws 404 when no task is linked", async () => {
      prisma.documents.findUnique.mockResolvedValue(
        doc({ graded_at: new Date() }),
      );
      await expect(grading.allowResubmit(1, undefined)).rejects.toThrow(
        NotFoundException,
      );
    });

    // fixed in M19: locked_until was set to the new deadline, so anything
    // reading it saw the unlocked task as "locked until" that date
    it("unlocks the linked task with the new deadline and notifies the student", async () => {
      const deadline = new Date("2026-12-24T10:00:00Z");
      prisma.documents.findUnique.mockResolvedValue(
        doc({ graded_at: new Date() }),
      );
      prisma.task_documents.findFirst.mockResolvedValue({
        tasks: { task_id: 7, title: "Mathe", deadline: null },
      });

      const result = await grading.allowResubmit(1, deadline);

      expect(prisma.tasks.update).toHaveBeenCalledWith({
        where: { task_id: 7 },
        data: {
          is_locked: false,
          locked_reason: null,
          locked_until: null,
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
