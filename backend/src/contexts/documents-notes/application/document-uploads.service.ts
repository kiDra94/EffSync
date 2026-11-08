import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { STAFF_ROLES } from "../../identity-access/application";
import { Notifier } from "../../notifications/application";
import { UnitOfWork } from "../../../shared/application/unit-of-work";
import { mayDelete, mayEdit } from "../domain/document-access";
import {
  ALLOWED_EXTENSIONS,
  contentContradictsExtension,
  extensionOf,
  sanitizeFileName,
} from "../domain/file-type";
import { DocumentAccessService } from "./document-access.service";
import { toDocumentView } from "./document-view";
import { DocumentRepository } from "./ports/document.repository";
import { DocumentStorage } from "./ports/document-storage";
import { FileInspector } from "./ports/file-inspector";

/** An uploaded file (Express.Multer.File satisfies it). */
interface UploadedFile {
  originalname?: string;
  buffer?: Buffer;
  size: number;
}

/** Uploading, renaming and deleting documents. */
@Injectable()
export class DocumentUploadsService {
  constructor(
    private readonly documents: DocumentRepository,
    private readonly access: DocumentAccessService,
    private readonly files: FileInspector,
    private readonly storage: DocumentStorage,
    private readonly unitOfWork: UnitOfWork,
    private readonly notifier: Notifier,
  ) {}

  async create(
    file: UploadedFile,
    userId: number,
    mimeType: string,
    role?: string,
    taskId?: number,
  ) {
    if (!file?.buffer || file.buffer.length === 0) {
      throw new BadRequestException("Dateiinhalt fehlt oder ist leer");
    }

    const extension = extensionOf(file.originalname || "upload.bin");
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      throw new BadRequestException("Dateiformat nicht erlaubt");
    }

    const detectedMime = this.files.detectMime(file.buffer);
    if (contentContradictsExtension(extension, detectedMime)) {
      throw new BadRequestException(
        `Dateiinhalt passt nicht zur Endung (${extension})`,
      );
    }

    const safeFileName = sanitizeFileName(file.originalname || "upload.bin");
    const normalizedTaskId = taskId ? Number(taskId) : undefined;
    if (normalizedTaskId) {
      await this.access.assertTaskLinkable(normalizedTaskId, userId, role);
    }

    const buffer = file.buffer;
    const created = await this.unitOfWork.run(async () => {
      const document = await this.documents.create({
        name: safeFileName,
        file_blob: new Uint8Array(buffer),
        file_size: file.size,
        mime_type: detectedMime || mimeType || "application/octet-stream",
        added_by: userId,
      });
      if (normalizedTaskId) {
        await this.documents.linkToTask(document.document_id, normalizedTaskId);
      }
      return document;
    });

    const document = await this.access.getDocument(created.document_id);
    const who = this.access.requester(userId, role);
    if (who.isStudent) {
      await this.notifyStaffAboutUpload(
        document.name || safeFileName,
        userId,
        normalizedTaskId,
      );
    }
    return toDocumentView(
      document,
      who,
      this.access.belongsToStudent(document),
    );
  }

  async update(
    id: number,
    input: { name: string },
    userId: number,
    role?: string,
  ) {
    const document = await this.access.getDocument(id);
    const who = this.access.requester(userId, role);
    if (!mayEdit(document, who)) {
      throw new ForbiddenException(
        "Sie dürfen dieses Dokument nicht bearbeiten",
      );
    }

    const updated = await this.documents.rename(id, input.name.trim());
    const renamed = await this.access.getDocument(updated.document_id);
    return toDocumentView(renamed, who, this.access.belongsToStudent(renamed));
  }

  async remove(id: number | string, userId: number, role?: string) {
    const documentId = Number(id);
    const document = await this.access.getDocument(documentId);
    const who = this.access.requester(userId, role);
    if (!mayDelete(document, who)) {
      throw new ForbiddenException(
        "Nur Schüler dürfen ihre eigenen Dokumente löschen",
      );
    }

    await this.unitOfWork.run(() => this.documents.delete(documentId));
    if (document.file_path) await this.storage.remove(document.file_path);

    return {
      message: "Dokument erfolgreich gelöscht",
      document_id: documentId,
    };
  }

  /** Every staff member except the uploader hears about a student's upload. */
  private async notifyStaffAboutUpload(
    documentName: string,
    uploaderId: number,
    taskId?: number,
  ) {
    const recipients = (
      await this.documents.findUserIdsWithRoles([...STAFF_ROLES])
    )
      .filter((userId) => Number.isFinite(userId) && userId > 0)
      .filter((userId) => userId !== Number(uploaderId));
    if (recipients.length === 0) return;

    const taskSuffix = taskId ? ` (Task #${taskId})` : "";
    await Promise.allSettled(
      recipients.map((userId) =>
        this.notifier.notify({
          userId,
          type: "document_uploaded",
          text: `Ein Schüler hat das Dokument "${documentName}" hochgeladen${taskSuffix}.`,
        }),
      ),
    );
  }
}
