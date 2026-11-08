import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Notifier } from "../../notifications/application";
import { UnitOfWork } from "../../../shared/application/unit-of-work";
import {
  TaskCompletionService,
  TaskResubmissionService,
} from "../../task-management/application";
import { isGradeableBy } from "../domain/document-access";
import { DocumentAccessService } from "./document-access.service";
import { toDocumentView } from "./document-view";
import { DocumentRepository } from "./ports/document.repository";

/** Grading a student's document and releasing its task for a resubmission. */
@Injectable()
export class DocumentGradingService {
  constructor(
    private readonly documents: DocumentRepository,
    private readonly access: DocumentAccessService,
    private readonly taskCompletion: TaskCompletionService,
    private readonly taskResubmission: TaskResubmissionService,
    private readonly unitOfWork: UnitOfWork,
    private readonly notifier: Notifier,
  ) {}

  async grade(
    id: number,
    input: { grade?: string; feedback?: string },
    graderId: number,
    role?: string,
  ) {
    const document = await this.access.getDocument(id);
    await this.access.assertAccess(id, graderId, role);
    if (
      !isGradeableBy(document, this.access.belongsToStudent(document), graderId)
    ) {
      throw new ForbiddenException(
        "Nur Lehrkräfte dürfen Schülerdokumente bewerten",
      );
    }

    const grade = input.grade?.trim() || null;
    const feedback = input.feedback?.trim() || null;
    if (!grade && !feedback) {
      throw new BadRequestException(
        "Mindestens Note oder Feedback muss angegeben werden",
      );
    }

    const linkedTaskIds = Array.from(
      new Set(
        (document.task_documents ?? [])
          .map((entry) => Number(entry.task_id))
          .filter((taskId) => Number.isFinite(taskId) && taskId > 0),
      ),
    );
    // the grade and the task completion commit together (L1); the
    // notification follows the commit
    const updated = await this.unitOfWork.run(async () => {
      const graded = await this.documents.recordGrade(
        id,
        grade,
        feedback,
        graderId,
      );
      // the one completion rule, in task-management (problems 2 and 3, M17)
      await this.taskCompletion.completeAfterGrading(linkedTaskIds);
      return graded;
    });

    if (document.added_by && Number(document.added_by) !== Number(graderId)) {
      const title = document.name || `Dokument #${document.document_id}`;
      const gradeSuffix = grade ? ` Note: ${grade}.` : "";
      await this.notifier.notify({
        userId: document.added_by,
        type: "document_graded",
        text: `Dein Dokument "${title}" wurde bewertet.${gradeSuffix}`,
      });
    }

    const graded = await this.access.getDocument(updated.document_id);
    return toDocumentView(
      graded,
      this.access.requester(graderId, role),
      this.access.belongsToStudent(graded),
    );
  }

  /**
   * Lets the student upload again: unlocks the graded document's task. The
   * role is checked by RolesGuard on PATCH /documents/:id/allow-resubmit.
   */
  async allowResubmit(documentId: number, newDeadline?: Date) {
    const document = await this.access.getDocument(documentId);
    if (!document.graded_at) {
      throw new BadRequestException(
        "Nur bewertete Dokumente können für Wiedereinreichung freigegeben werden",
      );
    }

    const link = await this.documents.findLinkedTask(documentId);
    if (!link) {
      throw new NotFoundException("Kein Task zu diesem Dokument verknüpft");
    }
    const task = link.tasks;
    await this.unitOfWork.run(() =>
      this.taskResubmission.reopen(task, newDeadline),
    );

    if (document.added_by) {
      await this.notifier.notify({
        userId: document.added_by,
        type: "RESUBMIT_ALLOWED",
        text: `Wiedereinreichung erlaubt für Task: ${task.title}. Neuer Abgabetermin: ${newDeadline ? newDeadline.toLocaleDateString("de-AT") : "unverändert"}`,
      });
    }

    // the grade stays; the student may upload again
    return {
      message: "Wiedereinreichung freigegeben - Student kann nun neu hochladen",
      task_id: task.task_id,
      task_title: task.title,
      new_deadline: newDeadline,
      document_id: documentId,
    };
  }
}
