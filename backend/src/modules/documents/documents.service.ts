import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateDocumentDto } from "./dto/update-document.dto";

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  // Erstellt einen neuen Datenbankeintrag nach erfolgreichem Upload und MIME-Check
  async create(file: Express.Multer.File, userId: number, validatedMime: string) {
    return this.prisma.document.create({
      data: {
        name: file.originalname,
        file_path: file.path,      // Pfad zum Speicherort (lokal oder Cloud)
        file_size: file.size,      // Speichert die Bytes für das 25MB-Limit
        mime_type: validatedMime,  // Der via "Magic Bytes" geprüfte Typ
        added_by: userId,
      },
    });
  }

  async findAll() {
    return this.prisma.document.findMany({
      orderBy: { created_at: 'desc' },
    });
  }
  
async findOne(id: string) {
  return this.prisma.document.findUnique({
    where: { document_id: Number(id) }, // Fix: string zu number
  });
}

async update(id: string, updateDocumentDto: UpdateDocumentDto) {
  return this.prisma.document.update({
    where: { document_id: Number(id) }, // Fix: string zu number
    data: updateDocumentDto,
  });
}

async remove(id: string) {
  return this.prisma.document.delete({
    where: { document_id: Number(id) }, // Fix: string zu number
  });
}
}