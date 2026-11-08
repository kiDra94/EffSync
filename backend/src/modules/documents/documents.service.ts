import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createReadStream, existsSync } from "fs";
import { unlink } from "fs/promises";
import { basename, extname, isAbsolute, relative, resolve } from "path";
import { Readable } from "stream";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";
import {
  isRoleIn,
  PRIVILEGED_ROLES,
  RoleName,
  STAFF_ROLES,
} from "../../contexts/identity-access/application";
import { NotificationsService } from "../notifications/notifications.service";
import { TaskCompletionService } from "../../contexts/task-management/application";
import { GradeDocumentDto } from "./dto/grade-document.dto";
import { UpdateDocumentDto } from "./dto/update-document.dto";

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private readonly taskCompletion: TaskCompletionService,
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
    document_shares: {
      select: {
        user_id: true,
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
        tasks: {
          select: {
            task_id: true,
            created_by: true,
          },
        },
      },
    },
  } as const;

  private readonly allowedExtensions = new Set([
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".bmp",
    ".webp",
    ".doc",
    ".docx",
    ".odt",
    ".rtf",
    ".txt",
    ".md",
    ".csv",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".ods",
    ".odp",
  ]);

  private readonly expectedMimeByExtension: Record<string, string[]> = {
    ".pdf": ["application/pdf"],
    ".jpg": ["image/jpeg"],
    ".jpeg": ["image/jpeg"],
    ".png": ["image/png"],
    ".gif": ["image/gif"],
    ".bmp": ["image/bmp"],
    ".webp": ["image/webp"],
    ".doc": ["application/msword"],
    ".docx": [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    ".odt": ["application/vnd.oasis.opendocument.text"],
    ".rtf": ["application/rtf", "text/rtf"],
    ".txt": ["text/plain"],
    ".md": ["text/markdown", "text/plain"],
    ".csv": ["text/csv", "application/csv"],
    ".xls": ["application/vnd.ms-excel"],
    ".xlsx": [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    ".ppt": ["application/vnd.ms-powerpoint"],
    ".pptx": [
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
    ".ods": ["application/vnd.oasis.opendocument.spreadsheet"],
    ".odp": ["application/vnd.oasis.opendocument.presentation"],
  };

  private detectMimeFromMagicBytes(buffer: Buffer | Uint8Array) {
    const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    if (bytes.length < 4) return null;

    // PDF: 25 50 44 46 -> "%PDF"
    if (
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46
    ) {
      return "application/pdf";
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    ) {
      return "image/png";
    }

    // JPEG: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return "image/jpeg";
    }

    // GIF: GIF87a / GIF89a
    if (
      bytes.length >= 6 &&
      bytes[0] === 0x47 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x38 &&
      (bytes[4] === 0x37 || bytes[4] === 0x39) &&
      bytes[5] === 0x61
    ) {
      return "image/gif";
    }

    // WEBP: RIFF....WEBP
    if (
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      return "image/webp";
    }

    // BMP: 42 4D
    if (bytes[0] === 0x42 && bytes[1] === 0x4d) {
      return "image/bmp";
    }

    return null;
  }

  // role names come from the JWT (first role, lower case); German aliases are gone (Q10)
  private isPrivileged(role?: string) {
    return isRoleIn(role, PRIVILEGED_ROLES);
  }

  private isTeacher(role?: string) {
    return isRoleIn(role, STAFF_ROLES);
  }

  private isStudent(role?: string) {
    return isRoleIn(role, [RoleName.STUDENT]);
  }

  private canUserReadAllDocuments(role?: string) {
    return this.isTeacher(role);
  }

  private async canUserReadAllDocumentsContext(userId: number, role?: string) {
    const isStudentContext = await this.isStudentContext(userId, role);
    if (isStudentContext) {
      return false;
    }

    if (this.isTeacher(role)) {
      return true;
    }

    const user = await this.prisma.users.findUnique({
      where: { user_id: userId },
      select: {
        user_roles: {
          select: {
            roles: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return Array.isArray(user?.user_roles)
      ? user.user_roles.some((entry) =>
          isRoleIn(entry.roles?.name, STAFF_ROLES),
        )
      : false;
  }

  private async isStudentContext(userId: number, role?: string) {
    if (this.isStudent(role)) {
      return true;
    }

    const user = await this.prisma.users.findUnique({
      where: { user_id: userId },
      select: {
        students: {
          select: {
            student_id: true,
          },
        },
        user_roles: {
          select: {
            roles: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return false;
    }

    const hasStudentProfile = Boolean(user.students?.student_id);
    const hasStudentRole = Array.isArray(user.user_roles)
      ? user.user_roles.some((entry) =>
          isRoleIn(entry.roles?.name, [RoleName.STUDENT]),
        )
      : false;

    return hasStudentProfile || hasStudentRole;
  }

  private async getTeacherNotificationRecipients(excludeUserId?: number) {
    const entries = await this.prisma.user_roles.findMany({
      where: {
        roles: {
          name: {
            in: [...STAFF_ROLES],
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
    const relativePath = relative(this.getUploadRoot(), absolutePath).replace(
      /\\/g,
      "/",
    );
    return relativePath.startsWith("..")
      ? basename(absolutePath)
      : relativePath;
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
    const roles: { roles?: { name?: string } }[] | undefined =
      document?.users?.user_roles;
    if (
      Array.isArray(roles) &&
      roles.some((entry) => isRoleIn(entry.roles?.name, [RoleName.STUDENT]))
    ) {
      return true;
    }

    return Boolean(document?.users?.students?.student_id);
  }

  private canStudentManageOwnDocument(
    document: any,
    userId: number,
    role?: string,
  ) {
    return (
      this.isStudent(role) && Number(document?.added_by) === Number(userId)
    );
  }

  private canEditDocument(document: any, userId: number, role?: string) {
    // Privileged users (Admin/Superuser) can edit everything
    if (this.isPrivileged(role)) {
      return true;
    }

    // Teachers can edit documents of their tasks
    if (this.isTeacher(role)) {
      const linkedTasks = document.task_documents || [];
      // Check whether the teacher created the task this document is linked to
      return linkedTasks.some(
        (td: any) => Number(td.tasks?.created_by) === Number(userId),
      );
    }

    // Students can edit only their own UNGRADED documents
    return (
      this.canStudentManageOwnDocument(document, userId, role) &&
      !document.graded_at
    );
  }

  private canDeleteDocument(document: any, userId: number, role?: string) {
    // Privileged users (Admin/Superuser) can delete everything
    if (this.isPrivileged(role)) {
      return true;
    }

    // Students can delete only their own UNGRADED documents
    if (this.canStudentManageOwnDocument(document, userId, role)) {
      // Once the document is graded, the student may NOT delete it
      if (document.graded_at) {
        return false;
      }
      return true;
    }

    return false;
  }

  private canResubmitTask(document: any, userId: number, role?: string) {
    // Only a teacher may allow the student a new upload
    return this.isTeacher(role) && this.documentBelongsToStudent(document);
  }

  private canGradeDocument(document: any, userId: number, role?: string) {
    return this.isTeacher(role) && this.isGradeableBy(document, userId);
  }

  // the role part is checked by RolesGuard on PATCH /documents/:id/grade (DB roles, M7)
  private isGradeableBy(document: any, userId: number) {
    return (
      Number(document?.added_by) !== Number(userId) &&
      this.documentBelongsToStudent(document)
    );
  }

  private mapPerson(person: any) {
    if (!person) return null;

    const primaryRole =
      person.user_roles?.[0]?.roles?.name?.toLowerCase?.() ?? null;
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
    const { file_blob, document_shares, ...safeDocument } = document;
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
        can_resubmit: this.canResubmitTask(document, userId, role),
      },
    };
  }

  private isExplicitlySharedWithUser(document: any, userId: number) {
    if (!Array.isArray(document?.document_shares)) {
      return false;
    }

    return document.document_shares.some(
      (share: any) => Number(share?.user_id) === Number(userId),
    );
  }

  private shouldStudentSeeDocument(document: any, userId: number) {
    return (
      Number(document?.added_by) === Number(userId) ||
      this.isExplicitlySharedWithUser(document, userId)
    );
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

  private async canUserAccessDocument(
    documentId: number,
    userId: number,
    role?: string,
  ) {
    const canReadAllDocuments = await this.canUserReadAllDocumentsContext(
      userId,
      role,
    );
    if (canReadAllDocuments) return true;

    const isStudentContext = await this.isStudentContext(userId, role);

    const document = await this.prisma.documents.findUnique({
      where: { document_id: documentId },
      select: { added_by: true },
    });

    if (!document) {
      return false;
    }

    if (isStudentContext) {
      const count = await this.prisma.documents.count({
        where: {
          document_id: documentId,
          OR: [
            { added_by: userId },
            { document_shares: { some: { user_id: userId } } },
          ],
        },
      });

      return count > 0;
    }

    const count = await this.prisma.documents.count({
      where: {
        document_id: documentId,
        OR: [
          { added_by: userId },
          { document_shares: { some: { user_id: userId } } },
          {
            task_documents: {
              some: {
                tasks: {
                  OR: [{ assigned_to: userId }, { created_by: userId }],
                },
              },
            },
          },
          {
            note_documents: {
              some: {
                notes: {
                  OR: [
                    { created_by: userId },
                    { notes_users: { some: { user_id: userId } } },
                  ],
                },
              },
            },
          },
        ],
      },
    });

    return count > 0;
  }

  private async canUserLinkToTask(
    taskId: number,
    userId: number,
    role?: string,
  ) {
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
      throw new NotFoundException(
        "Task für Dokument-Verknüpfung nicht gefunden",
      );
    }

    if (this.isTeacher(role)) {
      return task;
    }

    const isOwner = Number(task.created_by) === Number(userId);
    const isAssignee = Number(task.assigned_to) === Number(userId);
    const isMember =
      Array.isArray(task.task_members) && task.task_members.length > 0;

    if (!isOwner && !isAssignee && !isMember) {
      throw new ForbiddenException(
        "Du darfst nur Dokumente zu deinen eigenen Tasks verknüpfen",
      );
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

    const originalName = file.originalname || "upload.bin";
    const extension = extname(originalName).toLowerCase();
    if (!this.allowedExtensions.has(extension)) {
      throw new BadRequestException("Dateiformat nicht erlaubt");
    }

    const detectedMime = this.detectMimeFromMagicBytes(file.buffer);
    const expectedMimes = this.expectedMimeByExtension[extension] || [];

    if (
      detectedMime &&
      expectedMimes.length > 0 &&
      !expectedMimes.includes(detectedMime.toLowerCase())
    ) {
      throw new BadRequestException(
        `Dateiinhalt passt nicht zur Endung (${extension})`,
      );
    }

    const safeFileName = this.sanitizeFileName(originalName);
    const persistedMimeType =
      detectedMime || mimeType || "application/octet-stream";

    const normalizedTaskId = taskId ? Number(taskId) : undefined;
    if (normalizedTaskId) {
      await this.canUserLinkToTask(normalizedTaskId, userId, role);
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const createdDocument = await tx.documents.create({
        data: {
          name: safeFileName,
          file_blob: new Uint8Array(file.buffer),
          file_path: null,
          file_size: file.size,
          mime_type: persistedMimeType,
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
        document.name || safeFileName,
        userId,
        normalizedTaskId,
      );
    }

    return this.mapDocumentForUi(document, userId, role);
  }

  private sanitizeFileName(fileName: string) {
    const baseName = basename(fileName || "upload.bin").trim();
    const safeName = baseName
      // strips control characters from uploaded file names on purpose
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1F\x7F]/g, "")
      .replace(/[^a-zA-Z0-9._\- ]+/g, "_")
      .replace(/\s+/g, " ")
      .trim();

    return safeName || "upload.bin";
  }

  async findAll(userId: number, role?: string) {
    const isStudentContext = await this.isStudentContext(userId, role);
    const canReadAllDocuments = await this.canUserReadAllDocumentsContext(
      userId,
      role,
    );

    const where =
      canReadAllDocuments && !isStudentContext
        ? undefined
        : isStudentContext
          ? {
              OR: [
                { added_by: userId },
                { document_shares: { some: { user_id: userId } } },
              ],
            }
          : {
              OR: [
                { added_by: userId },
                { document_shares: { some: { user_id: userId } } },
                {
                  task_documents: {
                    some: {
                      tasks: {
                        OR: [{ assigned_to: userId }, { created_by: userId }],
                      },
                    },
                  },
                },
                {
                  note_documents: {
                    some: {
                      notes: {
                        OR: [
                          { created_by: userId },
                          { notes_users: { some: { user_id: userId } } },
                        ],
                      },
                    },
                  },
                },
              ],
            };

    const documents = await this.prisma.documents.findMany({
      where,
      include: this.relationInclude,
      orderBy: { created_at: "desc" },
    });

    const visibleDocuments = isStudentContext
      ? documents.filter((document) =>
          this.shouldStudentSeeDocument(document, userId),
        )
      : documents;

    return visibleDocuments.map((document) =>
      this.mapDocumentForUi(document, userId, role),
    );
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
        "Sie dürfen dieses Dokument nicht bearbeiten",
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

    if (!this.isGradeableBy(document, graderId)) {
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

    // ℹ️ NOTE: the task is NO LONGER locked globally
    // Instead: the student checks whether THEIR document was graded
    // The lock logic is now per student in the frontend

    const linkedTaskIds = Array.isArray(document.task_documents)
      ? Array.from(
          new Set(
            document.task_documents
              .map((entry) => Number(entry.task_id))
              .filter((taskId) => Number.isFinite(taskId) && taskId > 0),
          ),
        )
      : [];

    // the one completion rule, in task-management (problems 2 and 3, M17)
    await this.taskCompletion.completeAfterGrading(linkedTaskIds);

    if (document.added_by && Number(document.added_by) !== Number(graderId)) {
      const documentTitle =
        document.name || `Dokument #${document.document_id}`;
      const gradeSuffix = grade ? ` Note: ${grade}.` : "";

      await this.notificationsService.create({
        user_id: document.added_by,
        type: "document_graded",
        text: `Dein Dokument "${documentTitle}" wurde bewertet.${gradeSuffix}`,
      });
    }

    const completeDocument = await this.getDocumentById(updated.document_id);
    return this.mapDocumentForUi(completeDocument, graderId, role);
  }

  /**
   * Returns all grades (graded documents) of the current student
   * @param studentId - the student's user ID
   * @returns array of graded documents with grades and feedback
   */
  async getMyGrades(studentId: number) {
    const grades = await this.prisma.documents.findMany({
      where: {
        added_by: studentId,
        graded_at: { not: null }, // Only graded documents
      },
      include: {
        graded_by_user: {
          select: {
            user_id: true,
            firstname: true,
            lastname: true,
          },
        },
        task_documents: {
          select: {
            task_id: true,
            tasks: {
              select: {
                task_id: true,
                title: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: { graded_at: "desc" },
    });

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

  /**
   * Returns all documents linked to a task
   * Only the task's teacher or an admin may do this
   */
  async getDocumentsByTask(taskId: number, userId: number, role?: string) {
    // Permission check: teacher/admin or the student who uploaded
    const task = await this.prisma.tasks.findUnique({
      where: { task_id: taskId },
    });

    if (!task) {
      throw new NotFoundException("Task nicht gefunden");
    }

    // Only teacher/admin or the student themselves may see documents
    const isTeacher = this.isTeacher(role);
    const isPrivileged = this.isPrivileged(role);
    const isTaskCreator = task.created_by === userId;

    if (!isTeacher && !isPrivileged && !isTaskCreator) {
      throw new ForbiddenException(
        "Keine Berechtigung zum Einsehen dieser Task-Dokumente",
      );
    }

    // Get all documents for this task
    const documents = await this.prisma.documents.findMany({
      where: {
        task_documents: {
          some: {
            task_id: taskId,
          },
        },
      },
      include: {
        users: {
          select: {
            user_id: true,
            firstname: true,
            lastname: true,
            username: true,
          },
        },
        graded_by_user: {
          select: {
            user_id: true,
            firstname: true,
            lastname: true,
          },
        },
        task_documents: {
          select: {
            task_id: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    // Map with permissions and task context
    return documents.map((doc) => ({
      document_id: doc.document_id,
      name: doc.name,
      file_size: doc.file_size,
      mime_type: doc.mime_type,
      added_by: doc.added_by,
      uploader: doc.users?.[0] || null,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
      grade: doc.grade,
      feedback: doc.feedback,
      graded_by: doc.graded_by_user,
      graded_at: doc.graded_at,
      task_id: taskId,
      permissions: {
        can_download: true, // Teacher/admin may always download
        can_grade: isTeacher || isPrivileged,
        can_delete: isPrivileged, // Only an admin may delete
        can_edit: isTeacher || isPrivileged,
      },
    }));
  }

  /**
   * Lets the student upload again - unlocks the linked task
   * Only for teachers, after grading
   */
  async allowResubmit(
    documentId: number,
    newDeadline?: Date,
    teacherId?: number,
    role?: string,
  ) {
    // the role is checked by RolesGuard on PATCH /documents/:id/allow-resubmit (DB roles, M7)
    const document = await this.getDocumentById(documentId);
    if (!document) {
      throw new NotFoundException("Dokument nicht gefunden");
    }

    // Only graded work can be released
    if (!document.graded_at) {
      throw new BadRequestException(
        "Nur bewertete Dokumente können für Wiedereinreichung freigegeben werden",
      );
    }

    // Find the linked task
    const taskDoc = await this.prisma.task_documents.findFirst({
      where: { document_id: documentId },
      include: { tasks: true },
    });

    if (!taskDoc) {
      throw new NotFoundException("Kein Task zu diesem Dokument verknüpft");
    }

    const task = taskDoc.tasks;

    // Unlock the task
    await this.prisma.tasks.update({
      where: { task_id: task.task_id },
      data: {
        is_locked: false,
        locked_reason: null,
        locked_until: newDeadline || undefined,
        deadline: newDeadline || task.deadline, // Set new deadline if provided
      },
    });

    // Notify the student
    const studentId = document.added_by;
    if (studentId) {
      await this.notificationsService.create({
        user_id: studentId,
        type: "RESUBMIT_ALLOWED",
        text: `Wiedereinreichung erlaubt für Task: ${task.title}. Neuer Abgabetermin: ${newDeadline ? newDeadline.toLocaleDateString("de-AT") : "unverändert"}`,
      });
    }

    // Keep the grading status – the student may upload again
    return {
      message: "Wiedereinreichung freigegeben - Student kann nun neu hochladen",
      task_id: task.task_id,
      task_title: task.title,
      new_deadline: newDeadline,
      document_id: documentId,
    };
  }
}
