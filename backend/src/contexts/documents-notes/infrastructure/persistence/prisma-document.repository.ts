import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaUnitOfWork } from "../../../../shared/infrastructure/prisma/prisma-unit-of-work";
import { DocumentRepository } from "../../application/ports/document.repository";
import type {
  DocumentScope,
  NewDocument,
} from "../../application/ports/document-records";

/** What a document is read with (DocumentsService.relationInclude before M19). */
const RELATIONS = {
  users: {
    select: {
      user_id: true,
      firstname: true,
      lastname: true,
      username: true,
      students: { select: { student_id: true } },
      user_roles: { include: { roles: true } },
    },
  },
  document_shares: { select: { user_id: true } },
  graded_by_user: {
    select: { user_id: true, firstname: true, lastname: true, username: true },
  },
  task_documents: {
    select: {
      task_id: true,
      tasks: { select: { task_id: true, created_by: true } },
    },
  },
} as const;

/** The user's own, shared with them, or linked to their task or note. */
const related = (userId: number): Prisma.documentsWhereInput[] => [
  { added_by: userId },
  { document_shares: { some: { user_id: userId } } },
  {
    task_documents: {
      some: {
        tasks: { OR: [{ assigned_to: userId }, { created_by: userId }] },
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
];
/** A student's: own or shared with them. */
const ownOrShared = (userId: number): Prisma.documentsWhereInput[] =>
  related(userId).slice(0, 2);

/**
 * DocumentRepository on Prisma: the queries DocumentsService made before M19
 * (decision G1), all through the unit of work.
 */
@Injectable()
export class PrismaDocumentRepository extends DocumentRepository {
  constructor(private readonly unitOfWork: PrismaUnitOfWork) {
    super();
  }

  private get db() {
    return this.unitOfWork.client();
  }

  findWithRelations(documentId: number) {
    return this.db.documents.findUnique({
      where: { document_id: documentId },
      include: RELATIONS,
    });
  }

  findUploader(documentId: number) {
    return this.db.documents.findUnique({
      where: { document_id: documentId },
      select: { added_by: true },
    });
  }

  countAccessible(documentId: number, userId: number, studentContext: boolean) {
    return this.db.documents.count({
      where: {
        document_id: documentId,
        OR: studentContext ? ownOrShared(userId) : related(userId),
      },
    });
  }

  findAll(scope: DocumentScope, userId: number) {
    const where =
      scope === "all"
        ? undefined
        : { OR: scope === "student" ? ownOrShared(userId) : related(userId) };
    return this.db.documents.findMany({
      where,
      include: RELATIONS,
      orderBy: { created_at: "desc" },
    });
  }

  findGradesOf(studentId: number) {
    return this.db.documents.findMany({
      where: {
        added_by: studentId,
        graded_at: { not: null }, // only graded documents
      },
      include: {
        graded_by_user: {
          select: { user_id: true, firstname: true, lastname: true },
        },
        task_documents: {
          select: {
            task_id: true,
            tasks: { select: { task_id: true, title: true, status: true } },
          },
        },
      },
      orderBy: { graded_at: "desc" },
    });
  }

  findForTask(taskId: number) {
    return this.db.documents.findMany({
      where: { task_documents: { some: { task_id: taskId } } },
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
          select: { user_id: true, firstname: true, lastname: true },
        },
        task_documents: { select: { task_id: true } },
      },
      orderBy: { created_at: "desc" },
    });
  }

  findLinkedTask(documentId: number) {
    return this.db.task_documents.findFirst({
      where: { document_id: documentId },
      include: { tasks: true },
    });
  }

  findRoleNames(userId: number) {
    return this.db.users.findUnique({
      where: { user_id: userId },
      select: { user_roles: { select: { roles: { select: { name: true } } } } },
    });
  }

  findStudentProfile(userId: number) {
    return this.db.users.findUnique({
      where: { user_id: userId },
      select: {
        students: { select: { student_id: true } },
        user_roles: { select: { roles: { select: { name: true } } } },
      },
    });
  }

  async findUserIdsWithRoles(roleNames: string[]) {
    const entries = await this.db.user_roles.findMany({
      where: { roles: { name: { in: roleNames } } },
      select: { user_id: true },
      distinct: ["user_id"],
    });
    return entries.map((entry) => Number(entry.user_id));
  }

  findTaskForLinking(taskId: number, userId: number) {
    return this.db.tasks.findUnique({
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
  }

  findTask(taskId: number) {
    return this.db.tasks.findUnique({ where: { task_id: taskId } });
  }

  create(data: NewDocument) {
    return this.db.documents.create({ data: { ...data, file_path: null } });
  }

  async linkToTask(documentId: number, taskId: number) {
    await this.db.task_documents.create({
      data: { task_id: taskId, document_id: documentId },
    });
  }

  rename(documentId: number, name: string) {
    return this.db.documents.update({
      where: { document_id: documentId },
      data: { name },
    });
  }

  recordGrade(
    documentId: number,
    grade: string | null,
    feedback: string | null,
    graderId: number,
  ) {
    return this.db.documents.update({
      where: { document_id: documentId },
      data: { grade, feedback, graded_by: graderId, graded_at: new Date() },
    });
  }

  async delete(documentId: number) {
    const tx = this.db;
    const ofDocument = { where: { document_id: documentId } };
    await tx.document_shares.deleteMany(ofDocument);
    await tx.note_documents.deleteMany(ofDocument);
    await tx.task_documents.deleteMany(ofDocument);
    await tx.documents.delete(ofDocument);
  }
}
