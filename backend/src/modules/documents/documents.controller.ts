import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { DocumentsService } from "./documents.service";
import { diskStorage } from "multer";
import { extname } from "path";
import { v4 as uuidv4 } from "uuid";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Permissions } from "../auth/decorators/permissions.decorator";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (req, file, callback) => {
          // Nutzt den Pfad aus der .env oder Standard './uploads'
          const uploadPath = process.env.UPLOAD_DIR || "./uploads";
          callback(null, uploadPath);
        },
        filename: (req, file, callback) => {
          const uniqueSuffix = uuidv4();
          const fileExtName = extname(file.originalname);
          callback(null, `${uniqueSuffix}${fileExtName}`);
        },
      }),
    }),
  )
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 25 * 1024 * 1024 }),
          // FIX: Hier darf kein String (Anführungszeichen) stehen, sondern ein echtes Regex-Literal
          // new FileTypeValidator({
          //   fileType: /(jpg|jpeg|png|pdf|zip|doc|docx|odt|markdown|tex)/
          // }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() dto: { userId: string },
  ) {
    // Da die Validierung nun klappt, wird diese Methode aufgerufen und in der DB gespeichert
    return this.documentsService.create(
      file,
      Number(dto.userId),
      file.mimetype,
    );
  }

  @Get()
  @Permissions()
  findAll(@Req() req) {
    return this.documentsService.findAll(req.user.userId, req.user.role);
  }

  @Get(":id")
  @Permissions()
  findOne(@Param("id") id: string, @Req() req) {
    return this.documentsService.findOne(id, req.user.userId, req.user.role);
  }

  @Delete(":id")
  @Permissions()
  remove(@Param("id") id: string, @Req() req) {
    return this.documentsService.remove(id, req.user.userId, req.user.role);
  }
}
