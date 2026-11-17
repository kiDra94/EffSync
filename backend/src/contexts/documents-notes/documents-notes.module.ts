import { Module } from "@nestjs/common";
import { PrismaModule } from "../../shared/infrastructure/prisma/prisma.module";
import { DocumentAccessService } from "./application/document-access.service";
import { DocumentGradingService } from "./application/document-grading.service";
import { DocumentQueriesService } from "./application/document-queries.service";
import { DocumentUploadsService } from "./application/document-uploads.service";
import { NotesService } from "./application/notes.service";
import { DocumentRepository } from "./application/ports/document.repository";
import { DocumentStorage } from "./application/ports/document-storage";
import { FileInspector } from "../../shared/application/file-inspector";
import { NoteRepository } from "./application/ports/note.repository";
import { DocumentsAccountDeletion } from "./infrastructure/documents-account-deletion";
import { LocalDocumentStorage } from "./infrastructure/local-document-storage";
import { MagicByteFileInspector } from "../../shared/infrastructure/files/magic-byte-file-inspector";
import { PrismaDocumentRepository } from "./infrastructure/persistence/prisma-document.repository";
import { PrismaNoteRepository } from "./infrastructure/persistence/prisma-note.repository";
import { DocumentsController } from "./presentation/documents.controller";
import { NotesController } from "./presentation/notes.controller";

/**
 * documents-notes (GOALS.md M19): uploads, access, grading of submissions
 * and personal notes. Notifier comes from the notifications port binding,
 * TaskCompletionService and TaskResubmissionService from task-management,
 * the account deletion registry from identity-access (all global).
 */
@Module({
  imports: [PrismaModule],
  controllers: [DocumentsController, NotesController],
  providers: [
    DocumentAccessService,
    DocumentQueriesService,
    DocumentUploadsService,
    DocumentGradingService,
    NotesService,
    DocumentsAccountDeletion,
    { provide: DocumentRepository, useClass: PrismaDocumentRepository },
    { provide: NoteRepository, useClass: PrismaNoteRepository },
    { provide: DocumentStorage, useClass: LocalDocumentStorage },
    { provide: FileInspector, useClass: MagicByteFileInspector },
  ],
})
export class DocumentsNotesModule {}
