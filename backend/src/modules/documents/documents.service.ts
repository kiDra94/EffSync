import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createReadStream, existsSync } from "fs";
import { unlink } from "fs/promises";
import { basename, isAbsolute, relative, resolve } from "path";
import { Readable } from "stream";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { GradeDocumentDto } from "./dto/grade-document.dto";
import { UpdateDocumentDto } from "./dto/update-document.dto";

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  private readonly relationInclude = {
    users: {
      select: {
        user_id: true,
        firstname: true,
        lastname: true,
        username: true,
        students: {
          select: {
            student_id: true,
          },
        },
        user_roles: {
          include: {
            roles: true,
          },
        },
      },
    },
    graded_by_user: {
      select: {
        user_id: true,
        firstname: true,
        lastname: true,
        username: true,
      },
    },
    task_documents: {
      select: {
        task_id: true,
      },
    },
  } as const;

  private normalizeRole(role?: string) {
    const normalized = (role || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

    if (["schuler", "schueler"].includes(normalized)) return "student";
    if (["lehrer", "dozent"].includes(normalized)) return "teacher";
    if (["administrator"].includes(normalized)) return "admin";

    return normalized;
  }

  private isPrivileged(role?: string) {
    return ["superuser", "admin"].includes(this.normalizeRole(role));
  }

  private isTeacher(role?: string) {
    return ["teacher", "admin", "superuser"].includes(this.normalizeRole(role));
  }

  private isStudent(role?: string) {
    return this.normalizeRole(role) === "student";
  }

  private canUserReadAllDocuments(role?: string) {
    return this.isTeacher(role);
  }

  private async getTeacherNotificationRecipients(excludeUserId?: number) {
    const entries = await this.prisma.user_roles.findMany({
      where: {
        roles: {
          name: {
            in: ["Teacher", "Admin", "Superuser"],
          },
        },
      },
      select: {
        user_id: true,
      },
      distinct: ["user_id"],
    });

    return entries
      .map((entry) => Number(entry.user_id))
      .filter((userId) => Number.isFinite(userId) && userId > 0)
      .filter((userId) => Number(userId) !== Number(excludeUserId));
  }

  private async notifyTeachersAboutStudentUpload(
    documentName: string,
    uploaderId: number,
    taskId?: number,
  ) {
    const recipients = await this.getTeacherNotificationRecipients(uploaderId);

    if (recipients.length === 0) {
      return;
    }

    const taskSuffix = taskId ? ` (Task #${taskId})` : "";
    await Promise.allSettled(
      recipients.map((userId) =>
        this.notificationsService.create({
          user_id: userId,
          type: "document_uploaded",
          text: `Ein Schüler hat das Dokument "${documentName}" hochgeladen${taskSuffix}.`,
        }),
      ),
    );
  }

  private getUploadRoot() {
    return resolve(process.cwd(), process.env.UPLOAD_DIR || "./uploads");
  }

  private toStoredRelativePath(filePath: string) {
    const absolutePath = resolve(filePath);
    const relativePath = relative(this.getUploadRoot(), absolutePath).replace(/\\/g, "/");
    return relativePath.startsWith("..") ? basename(absolutePath) : relativePath;
  }

  private resolveDocumentPath(filePath?: string | null) {
    if (!filePath) {
      throw new NotFoundException("Datei zum Dokument wurde nicht gefunden");
    }

    if (isAbsolute(filePath)) {
      return filePath;
    }

    const sanitizedPath = filePath.replace(/^\.\/?/, "");
    if (sanitizedPath.startsWith("uploads/")) {
      return resolve(process.cwd(), sanitizedPath);
    }

    return resolve(this.getUploadRoot(), sanitizedPath);
  }

  private documentBelongsToStudent(document: any) {
    const roles = document?.users?.user_roles?.map((entry) =>
      entry.roles?.name?.toLowerCase(),
    );

    if (Array.isArray(roles) && roles.includes("student")) {
      return true;
    }

    return Boolean(document?.users?.students?.student_id);
  }

  private canStudentManageOwnDocument(document: any, userId: number, role?: string) {
    return this.isStudent(role) && Number(document?.added_by) === Number(userId);
  }

  private canEditDocument(document: any, userId: number, role?: string) {
    return this.isPrivileged(role) || this.canStudentManageOwnDocument(document, userId, role);
  }

  private canDeleteDocument(document: any, userId: number, role?: string) {
    return this.isPrivileged(role) || this.canStudentManageOwnDocument(document, userId, role);
  }

  private canGradeDocument(document: any, userId: number, role?: string) {
    return (
      this.isTeacher(role) &&
      Number(document?.added_by) !== Number(userId) &&
      this.documentBelongsToStudent(document)
    );
  }

  private mapPerson(person: any) {
    if (!person) return null;

    const primaryRole = person.user_roles?.[0]?.roles?.name?.toLowerCase?.() ?? null;
    return {
      user_id: person.user_id,
      firstname: person.firstname,
      lastname: person.lastname,
      username: person.username,
      full_name: [person.firstname, person.lastname].filter(Boolean).join(" "),
      role: primaryRole,
    };
  }

  private mapDocumentForUi(document: any, userId: number, role?: string) {
    const { file_blob, ...safeDocument } = document;
    const uploader = this.mapPerson(document.users);
    const grader = this.mapPerson(document.graded_by_user);
    const linkedTaskIds = Array.isArray(document.task_documents)
      ? document.task_documents.map((entry) => entry.task_id)
      : [];

    return {
      ...safeDocument,
      uploader,
      grader,
      linked_task_ids: linkedTaskIds,
      primary_task_id: linkedTaskIds[0] ?? null,
      is_gradeable: this.documentBelongsToStudent(document),
      permissions: {
        can_view: true,
        can_download: true,
        can_edit: this.canEditDocument(document, userId, role),
        can_delete: this.canDeleteDocument(document, userId, role),
        can_grade: this.canGradeDocument(document, userId, role),
      },
    };
  }

  private async getDocumentById(documentId: number) {
    const document = await this.prisma.documents.findUnique({
      where: { document_id: documentId },
      include: this.relationInclude,
    });

    if (!document) {
      throw new NotFoundException("Dokument nicht gefunden");
    }

    return document;
  }

  private async canUserAccessDocument(documentId: number, userId: number, role?: string) {
    if (this.canUserReadAllDocuments(role)) return true;

    const document = await this.prisma.documents.findUnique({
      where: { document_id: documentId },
      select: { added_by: true },
    });

    if (!document) {
      return false;
    }

    if (this.isStudent(role)) {
      return Number(document.added_by) === Number(userId);
    }

    const count = await this.prisma.documents.count({
      where: {
        document_id: documentId,
        OR: [
          { added_by: userId },
          { document_shares: { some: { user_id: userId } } },
          { task_documents: { some: { tasks: { OR: [{ assigned_to: userId }, { created_by: userId }] } } } },
          { note_documents: { some: { notes: { OR: [{ created_by: userId }, { notes_users: { some: { user_id: userId } } }] } } } },
        ],
      },
    });

    return count > 0;
  }

  private async canUserLinkToTask(taskId: number, userId: number, role?: string) {
    const task = await this.prisma.tasks.findUnique({
      where: { task_id: taskId },
      select: {
        task_id: true,
        created_by: true,
        assigned_to: true,
        task_members: {
          where: { user_id: userId },
          select: { user_id: true },
        },
      },
    });

    if (!task) {
      throw new NotFoundException("Task für Dokument-Verknüpfung nicht gefunden");
    }

    if (this.isTeacher(role)) {
      return task;
    }

    const isOwner = Number(task.created_by) === Number(userId);
    const isAssignee = Number(task.assigned_to) === Number(userId);
    const isMember = Array.isArray(task.task_members) && task.task_members.length > 0;

    if (!isOwner && !isAssignee && !isMember) {
      throw new ForbiddenException("Du darfst nur Dokumente zu deinen eigenen Tasks verknüpfen");
    }

    return task;
  }

  async create(
    file: Express.Multer.File,
    userId: number,
    mimeType: string,
    role?: string,
    taskId?: number,
  ) {
    if (!file?.buffer || file.buffer.length === 0) {
      throw new BadRequestException("Dateiinhalt fehlt oder ist leer");
    }

    const normalizedTaskId = taskId ? Number(taskId) : undefined;
    if (normalizedTaskId) {
      await this.canUserLinkToTask(normalizedTaskId, userId, role);
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const createdDocument = await tx.documents.create({
        data: {
          name: file.originalname,
          file_blob: new Uint8Array(file.buffer),
          file_path: null,
          file_size: file.size,
          mime_type: mimeType,
          added_by: userId,
        },
      });

      if (normalizedTaskId) {
        await tx.task_documents.create({
          data: {
            task_id: normalizedTaskId,
            document_id: createdDocument.document_id,
          },
        });
      }

      return createdDocument;
    });

    const document = await this.getDocumentById(created.document_id);

    if (this.isStudent(role)) {
      await this.notifyTeachersAboutStudentUpload(
        document.name || file.originalname,
        userId,
        normalizedTaskId,
      );
    }

    return this.mapDocumentForUi(document, userId, role);
  }

  async findAll(userId: number, role?: string) {
    const where = this.canUserReadAllDocuments(role)
      ? undefined
      : this.isStudent(role)
        ? { added_by: userId }
      : {
          OR: [
            { added_by: userId },
            { document_shares: { some: { user_id: userId } } },
            { task_documents: { some: { tasks: { OR: [{ assigned_to: userId }, { created_by: userId }] } } } },
            { note_documents: { some: { notes: { OR: [{ created_by: userId }, { notes_users: { some: { user_id: userId } } }] } } } },
          ],
        };

    const documents = await this.prisma.documents.findMany({
      where,
      include: this.relationInclude,
      orderBy: { created_at: "desc" },
    });

    return documents.map((document) => this.mapDocumentForUi(document, userId, role));
  }

  async findOne(id: string, userId: number, role?: string) {
    const documentId = Number(id);
    const document = await this.getDocumentById(documentId);

    const allowed = await this.canUserAccessDocument(documentId, userId, role);
    if (!allowed) {
      throw new ForbiddenException("Kein Zugriff auf dieses Dokument");
    }

    return this.mapDocumentForUi(document, userId, role);
  }

  async update(
    id: number,
    updateDocumentDto: UpdateDocumentDto,
    userId: number,
    role?: string,
  ) {
    const document = await this.getDocumentById(id);

    if (!this.canEditDocument(document, userId, role)) {
      throw new ForbiddenException(
        "Nur Schüler dürfen ihre eigenen Dokumente bearbeiten",
      );
    }

    const updated = await this.prisma.documents.update({
      where: { document_id: id },
      data: {
        name: updateDocumentDto.name.trim(),
      },
    });

    const completeDocument = await this.getDocumentById(updated.document_id);
    return this.mapDocumentForUi(completeDocument, userId, role);
  }

  async grade(
    id: number,
    gradeDocumentDto: GradeDocumentDto,
    graderId: number,
    role?: string,
  ) {
    const document = await this.getDocumentById(id);

    if (!(await this.canUserAccessDocument(id, graderId, role))) {
      throw new ForbiddenException("Kein Zugriff auf dieses Dokument");
    }

    if (!this.canGradeDocument(document, graderId, role)) {
      throw new ForbiddenException(
        "Nur Lehrkräfte dürfen Schülerdokumente bewerten",
      );
    }

    const grade = gradeDocumentDto.grade?.trim() || null;
    const feedback = gradeDocumentDto.feedback?.trim() || null;

    if (!grade && !feedback) {
      throw new BadRequestException(
        "Mindestens Note oder Feedback muss angegeben werden",
      );
    }

    const updated = await this.prisma.documents.update({
      where: { document_id: id },
      data: {
        grade,
        feedback,
        graded_by: graderId,
        graded_at: new Date(),
      },
    });

    if (document.added_by && Number(document.added_by) !== Number(graderId)) {
      const documentTitle = document.name || `Dokument #${document.document_id}`;
      const gradeSuffix = grade ? ` Note: ${grade}.` : "";

      await this.notificationsService.create({
        user_id: document.added_by,
        type: "document_graded",
        text: `Dein Dokument \"${documentTitle}\" wurde bewertet.${gradeSuffix}`,
      });
    }

    const completeDocument = await this.getDocumentById(updated.document_id);
    return this.mapDocumentForUi(completeDocument, graderId, role);
  }

  async getDownloadPayload(id: number, userId: number, role?: string) {
    const document = await this.getDocumentById(id);

    const allowed = await this.canUserAccessDocument(id, userId, role);
    if (!allowed) {
      throw new ForbiddenException("Kein Zugriff auf dieses Dokument");
    }

    if (document.file_blob && document.file_blob.length > 0) {
      const binary = Buffer.isBuffer(document.file_blob)
        ? document.file_blob
        : Buffer.from(document.file_blob);

      return {
        fileName: document.name || `document-${document.document_id}`,
        mimeType: document.mime_type || "application/octet-stream",
        stream: Readable.from([binary]),
      };
    }

    const resolvedPath = this.resolveDocumentPath(document.file_path);
    if (!existsSync(resolvedPath)) {
      throw new NotFoundException("Datei zum Dokument wurde nicht gefunden");
    }

    return {
      fileName: document.name || `document-${document.document_id}`,
      mimeType: document.mime_type || "application/octet-stream",
      stream: createReadStream(resolvedPath),
    };
  }

  async remove(id: string, userId: number, role?: string) {
    const documentId = Number(id);
    const document = await this.getDocumentById(documentId);

    if (!this.canDeleteDocument(document, userId, role)) {
      throw new ForbiddenException(
        "Nur Schüler dürfen ihre eigenen Dokumente löschen",
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.document_shares.deleteMany({
        where: { document_id: documentId },
      });

      await tx.note_documents.deleteMany({
        where: { document_id: documentId },
      });

      await tx.task_documents.deleteMany({
        where: { document_id: documentId },
      });

      await tx.documents.delete({
        where: { document_id: documentId },
      });
    });

    if (document.file_path) {
      const resolvedPath = this.resolveDocumentPath(document.file_path);
      if (existsSync(resolvedPath)) {
        await unlink(resolvedPath).catch(() => undefined);
      }
    }

    return {
      message: "Dokument erfolgreich gelöscht",
      document_id: documentId,
    };
  }
}
