import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Readable } from "stream";
import { DocumentAccessService } from "./document-access.service";
import { toDocumentView } from "./document-view";
import { DocumentRepository } from "./ports/document.repository";
import { DocumentStorage } from "./ports/document-storage";
import { studentMaySee } from "../domain/document-access";

/** Reading documents: lists, one document, grades, downloads, a task's documents. */
@Injectable()
export class DocumentQueriesService {
  constructor(
    private readonly documents: DocumentRepository,
    private readonly access: DocumentAccessService,
    private readonly storage: DocumentStorage,
  ) {}

  async findAll(userId: number, role?: string) {
    const studentContext = await this.access.isStudentContext(userId, role);
    const readsAll = await this.access.canReadAll(userId, role);
    // canReadAll is false in a student context
    const scope = studentContext ? "student" : readsAll ? "all" : "related";

    const documents = await this.documents.findAll(scope, userId);
    const visible = studentContext
      ? documents.filter((document) => studentMaySee(document, userId))
      : documents;

    const who = this.access.requester(userId, role);
    return visible.map((document) =>
      toDocumentView(document, who, this.access.belongsToStudent(document)),
    );
  }

  async findOne(id: number | string, userId: number, role?: string) {
    const documentId = Number(id);
    const document = await this.access.getDocument(documentId);
    await this.access.assertAccess(documentId, userId, role);
    return toDocumentView(
      document,
      this.access.requester(userId, role),
      this.access.belongsToStudent(document),
    );
  }

  /** The current student's graded documents with grade and feedback. */
  async getMyGrades(studentId: number) {
    const grades = await this.documents.findGradesOf(studentId);
    return grades.map((doc) => ({
      document_id: doc.document_id,
      name: doc.name,
      file_size: doc.file_size,
      mime_type: doc.mime_type,
      grade: doc.grade,
      feedback: doc.feedback,
      graded_by: doc.graded_by_user,
      graded_at: doc.graded_at,
      task_title: doc.task_documents[0]?.tasks?.title || null,
      task_id: doc.task_documents[0]?.task_id || null,
    }));
  }

  async getDownloadPayload(id: number, userId: number, role?: string) {
    const document = await this.access.getDocument(id);
    await this.access.assertAccess(id, userId, role);

    const fileName = document.name || `document-${document.document_id}`;
    const mimeType = document.mime_type || "application/octet-stream";
    if (document.file_blob && document.file_blob.length > 0) {
      const binary = Buffer.isBuffer(document.file_blob)
        ? document.file_blob
        : Buffer.from(document.file_blob);
      return { fileName, mimeType, stream: Readable.from([binary]) };
    }
    return {
      fileName,
      mimeType,
      stream: this.storage.open(document.file_path),
    };
  }

  /** The documents linked to a task: for staff and the task's creator. */
  async getDocumentsByTask(taskId: number, userId: number, role?: string) {
    const task = await this.documents.findTask(taskId);
    if (!task) throw new NotFoundException("Task nicht gefunden");

    const who = this.access.requester(userId, role);
    if (!who.isTeacher && !who.isPrivileged && task.created_by !== userId) {
      throw new ForbiddenException(
        "Keine Berechtigung zum Einsehen dieser Task-Dokumente",
      );
    }

    const documents = await this.documents.findForTask(taskId);
    return documents.map((doc) => ({
      document_id: doc.document_id,
      name: doc.name,
      file_size: doc.file_size,
      mime_type: doc.mime_type,
      added_by: doc.added_by,
      // fixed in M19: read as `users?.[0]`, always null (users is one person)
      uploader: doc.users ?? null,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
      grade: doc.grade,
      feedback: doc.feedback,
      graded_by: doc.graded_by_user,
      graded_at: doc.graded_at,
      task_id: taskId,
      permissions: {
        can_download: true, // staff may always download
        can_grade: who.isTeacher || who.isPrivileged,
        can_delete: who.isPrivileged, // only an admin deletes
        can_edit: who.isTeacher || who.isPrivileged,
      },
    }));
  }
}
