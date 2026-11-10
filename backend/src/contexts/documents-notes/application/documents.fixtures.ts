/**
 * Shared setup of the documents characterization specs (GOALS.md M1, split
 * by service in M19): a Prisma mock and the three document use cases built
 * on the real repositories, so the specs pin the same queries as before.
 */
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import { PrismaUnitOfWork } from "../../../shared/infrastructure/prisma/prisma-unit-of-work";
import type { NotificationsService } from "../../notifications/application/notifications.service";
import { InAppNotifier } from "../../notifications/application/in-app-notifier";
import {
  TaskCompletionService,
  TaskResubmissionService,
  type TaskRealtime,
} from "../../task-management/application";
import type { TaskNotificationsService } from "../../task-management/application/task-notifications.service";
import { PrismaTaskRepository } from "../../task-management/infrastructure/persistence/prisma-task.repository";
import { LocalDocumentStorage } from "../infrastructure/local-document-storage";
import { MagicByteFileInspector } from "../../../shared/infrastructure/files/magic-byte-file-inspector";
import { PrismaDocumentRepository } from "../infrastructure/persistence/prisma-document.repository";
import { DocumentAccessService } from "./document-access.service";
import { DocumentGradingService } from "./document-grading.service";
import { DocumentQueriesService } from "./document-queries.service";
import { DocumentUploadsService } from "./document-uploads.service";

export function createPrismaMock() {
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
    tasks: {
      findUnique: jest.fn().mockResolvedValue(null),
      // M17: grading loads the linked tasks in one query
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
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

export const studentUploader = (userId: number) => ({
  user_id: userId,
  firstname: "Lisa",
  lastname: "Schüler",
  username: "lisa",
  students: { student_id: userId },
  user_roles: [{ roles: { name: "Student" } }],
});

export const teacherUploader = (userId: number) => ({
  user_id: userId,
  firstname: "Anna",
  lastname: "Lehrer",
  username: "anna",
  students: null,
  user_roles: [{ roles: { name: "Teacher" } }],
});

export const doc = (overrides: Partial<Doc> = {}): Doc => ({
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

export const pdfFile = (overrides: Partial<Express.Multer.File> = {}) =>
  ({
    originalname: "abgabe.pdf",
    buffer: Buffer.from("%PDF-1.4"),
    size: 8,
    mimetype: "application/pdf",
    ...overrides,
  }) as Express.Multer.File;

/** The document use cases on `prisma`, notifying through `notifications`. */
export function createDocumentServices(
  prisma: object,
  notifications: { create: jest.Mock },
) {
  const unitOfWork = new PrismaUnitOfWork(prisma as unknown as PrismaService);
  const documents = new PrismaDocumentRepository(unitOfWork);
  const access = new DocumentAccessService(documents);
  const storage = new LocalDocumentStorage();
  const notifier = new InAppNotifier(
    notifications as unknown as NotificationsService,
  );
  const tasks = new PrismaTaskRepository(unitOfWork);
  return {
    queries: new DocumentQueriesService(documents, access, storage),
    uploads: new DocumentUploadsService(
      documents,
      access,
      new MagicByteFileInspector(),
      storage,
      unitOfWork,
      notifier,
    ),
    grading: new DocumentGradingService(
      documents,
      access,
      // M17: grading completes tasks through task-management's one rule
      new TaskCompletionService(
        tasks,
        {} as TaskRealtime,
        { statusChanged: jest.fn() } as unknown as TaskNotificationsService,
      ),
      new TaskResubmissionService(tasks),
      unitOfWork,
      notifier,
    ),
  };
}
