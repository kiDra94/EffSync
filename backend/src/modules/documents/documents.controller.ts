import {Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, BadRequestException, FileTypeValidator, ParseFilePipe, 
  MaxFileSizeValidator, ParseIntPipe,} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { DocumentsService } from "./documents.service";
import { UpdateDocumentDto } from "./dto/update-document.dto";
import { fileTypeFromBuffer } from "file-type"; // Magic Bytes Prüfung
import { CreateDocumentDto } from "./dto/create-document.dto";
import { diskStorage } from "multer";
import { extname } from "path";
import { v4 as uuidv4 } from 'uuid';

@Controller("documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

@Post('upload')
@UseInterceptors(FileInterceptor('file', {
  storage: diskStorage({
    destination: './uploads',
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

      new FileTypeValidator({ fileType: '.(png|jpeg|jpg|pdf|zip|doc|docx|odt|md|tex)' }),
    ],
  })) 
  file: Express.Multer.File,
  @Body() dto: { userId: string } 
) {
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

 @Patch(':id')
async update(@Param('id', ParseIntPipe) id: number, @Body() updateDocumentDto: UpdateDocumentDto) {
  return this.documentsService.update(id, updateDocumentDto);
}

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.documentsService.remove(id);
  }
}
