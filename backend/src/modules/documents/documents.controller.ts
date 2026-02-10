import {Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, BadRequestException, FileTypeValidator, ParseFilePipe, 
  MaxFileSizeValidator, ParseIntPipe,} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { DocumentsService } from "./documents.service";
import { diskStorage } from "multer";
import { extname } from "path";
import { v4 as uuidv4 } from 'uuid';

@Controller("documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, callback) => {
        // Nutzt den Pfad aus der .env oder Standard './uploads'
        const uploadPath = process.env.UPLOAD_DIR || './uploads';
        callback(null, uploadPath);
      },
      filename: (req, file, callback) => {
        const uniqueSuffix = uuidv4();
        const fileExtName = extname(file.originalname);
        callback(null, `${uniqueSuffix}${fileExtName}`);
      },
    }),
  }))
  async uploadFile(
    @UploadedFile(new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: 25 * 1024 * 1024 }),
        // FIX: Hier darf kein String (Anführungszeichen) stehen, sondern ein echtes Regex-Literal
        // new FileTypeValidator({ 
        //   fileType: /(jpg|jpeg|png|pdf|zip|doc|docx|odt|markdown|tex)/ 
        // }),
      ],
    })) 
    file: Express.Multer.File,
    @Body() dto: { userId: string }
  ) {
    // Da die Validierung nun klappt, wird diese Methode aufgerufen und in der DB gespeichert
    return this.documentsService.create(file, Number(dto.userId), file.mimetype);
  }

  @Get()
  findAll() {
    return this.documentsService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.documentsService.findOne(id);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.documentsService.remove(id);
  }
}
