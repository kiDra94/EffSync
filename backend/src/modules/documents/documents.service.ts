import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateDocumentDto } from "./dto/update-document.dto";

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

async create(file: Express.Multer.File, userId: number, mimeType: string) {
    // Hier erstellen wir den Datenbank-Eintrag 
    return this.prisma.documents.create({
      data: {
        name: file.originalname,      // Aus dem Multer-File Objekt
        file_path: file.path,         // Wo die Datei auf dem Server liegt
        file_size: file.size,         // Größe in Bytes
        mime_type: mimeType,          // Dein validierter MIME-Typ
        added_by: userId,             // Die konvertierte ID (aus dem Controller)
      },
    });
  }

  async findAll() {
    return this.prisma.documents.findMany({
      orderBy: { created_at: 'desc' },
    });
  }
  
async findOne(id: string) {
  return this.prisma.documents.findUnique({
    where: { document_id: Number(id) }, // Fix: string zu number
  });
}

async update(id: number, updateDocumentDto: UpdateDocumentDto) {
  // Wir holen userId aus dem DTO heraus
  const { userId, ...rest } = updateDocumentDto;

  return this.prisma.documents.update({
    // 1. Dein Primärschlüssel heißt laut Schema 'document_id'
    where: { document_id: id }, 
    data: {
      ...rest,
      // 2. Wir weisen den Wert dem Feld 'added_by' zu
      // Prisma erwartet hier ein Int, daher die Konvertierung mit Number()
      added_by: userId ? Number(userId) : undefined,
    },
  });
}

async remove(id: string) {
  return this.prisma.documents.delete({
    where: { document_id: Number(id) }, // Fix: string zu number
  });
}
}