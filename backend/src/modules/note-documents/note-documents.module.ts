import { Module } from "@nestjs/common";
import { NoteDocumentsController } from "./note-documents.controller";
import { NoteDocumentsService } from "./note-documents.service";

@Module({
  controllers: [NoteDocumentsController],
  providers: [NoteDocumentsService],
})
export class NoteDocumentsModule {}
