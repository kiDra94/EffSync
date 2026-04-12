import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UpdateDocumentDto } from "./dto/update-document.dto";

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  private isPrivileged(role?: string) {
    return role === "superuser" || role === "admin";
  }

  private async canUserAccessDocument(documentId: number, userId: number, role?: string) {
    if (this.isPrivileged(role)) return true;

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

  async create(file: Express.Multer.File, userId: number, mimeType: string) {
    // Hier erstellen wir den Datenbank-Eintrag
    return this.prisma.documents.create({
      data: {
        name: file.originalname, // Aus dem Multer-File Objekt
        file_path: file.path, // Wo die Datei auf dem Server liegt
        file_size: file.size, // Größe in Bytes
        mime_type: mimeType, // Dein validierter MIME-Typ
        added_by: userId, // Die konvertierte ID (aus dem Controller)
      },
    });
  }

  async findAll(userId: number, role?: string) {
    const where = this.isPrivileged(role)
      ? undefined
      : {
          OR: [
            { added_by: userId },
            { document_shares: { some: { user_id: userId } } },
            { task_documents: { some: { tasks: { OR: [{ assigned_to: userId }, { created_by: userId }] } } } },
            { note_documents: { some: { notes: { OR: [{ created_by: userId }, { notes_users: { some: { user_id: userId } } }] } } } },
          ],
        };

    return this.prisma.documents.findMany({
      where,
      orderBy: { created_at: "desc" },
    });
  }

  async findOne(id: string, userId: number, role?: string) {
    const documentId = Number(id);
    const document = await this.prisma.documents.findUnique({
      where: { document_id: documentId },
    });

    if (!document) {
      throw new NotFoundException("Dokument nicht gefunden");
    }

    const allowed = await this.canUserAccessDocument(documentId, userId, role);
    if (!allowed) {
      throw new ForbiddenException("Kein Zugriff auf dieses Dokument");
    }

    return document;
  }

  async update(id: number, updateDocumentDto: UpdateDocumentDto) {
    // Wir holen userId aus dem DTO heraus
    return this.prisma.documents.update({
      where: { document_id: id },
      data: updateDocumentDto, // <-- Direkt das DTO übergeben
    });
  }

  async remove(id: string, userId: number, role?: string) {
    const documentId = Number(id);
    const document = await this.prisma.documents.findUnique({
      where: { document_id: documentId },
    });

    if (!document) {
      throw new NotFoundException("Dokument nicht gefunden");
    }

    const canDelete = this.isPrivileged(role) || document.added_by === userId;
    if (!canDelete) {
      throw new ForbiddenException("Nur Besitzer oder Admin darf Dokumente löschen");
    }

    return this.prisma.documents.delete({
      where: { document_id: documentId },
    });
  }
}
