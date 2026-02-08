import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { DocumentsService } from "./documents.service";
import { UpdateDocumentDto } from "./dto/update-document.dto";
import { fileTypeFromBuffer } from "file-type"; // Magic Bytes Prüfung

@Controller("documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: 25 * 1024 * 1024, // Hartes 25MB Limit am Server
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body("userId") userId: string,
  ) {
    if (!file) {
      throw new BadRequestException("Keine Datei hochgeladen");
    }

    // 1. MIME-Check via Magic Numbers (file-type)
    // Liest die ersten Bytes des Puffers, um den echten Typ zu bestimmen
    const type = await fileTypeFromBuffer(file.buffer);
    
    // Whitelist der erlaubten Typen
    const allowedMimeTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
    ];

    if (!type || !allowedMimeTypes.includes(type.mime)) {
      throw new BadRequestException(
        `Dateityp ${type?.mime || "unbekannt"} ist nicht erlaubt!`,
      );
    }

    // 2. Speichern via Prisma über den Service
    // Wir übergeben das File-Objekt, die User-ID und den validierten MIME-Typ
    return this.documentsService.create(file, Number(userId), type.mime);
  }

  @Get()
  findAll() {
    return this.documentsService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    // Falls deine ID in Prisma ein String (UUID) ist, entferne das '+'
    return this.documentsService.findOne(id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
  ) {
    return this.documentsService.update(id, updateDocumentDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.documentsService.remove(id);
  }
}