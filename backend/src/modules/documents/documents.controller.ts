import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  ParseIntPipe,
  Req,
  Res,
  StreamableFile,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { DocumentsService } from "./documents.service";
import { memoryStorage } from "multer";
import { extname } from "path";
import type { Response } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { UpdateDocumentDto } from "./dto/update-document.dto";
import { GradeDocumentDto } from "./dto/grade-document.dto";
import { UploadDocumentDto } from "./dto/upload-document.dto";

const ALLOWED_UPLOAD_EXTENSIONS = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".bmp",
  ".webp",
  ".doc",
  ".docx",
  ".odt",
  ".rtf",
  ".txt",
  ".csv",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".ods",
  ".odp",
];

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      fileFilter: (req, file, callback) => {
        const extension = extname(file.originalname || "").toLowerCase();

        if (!ALLOWED_UPLOAD_EXTENSIONS.includes(extension)) {
          callback(
            new BadRequestException(
              "Erlaubte Formate: PDF, JPG, JPEG, PNG, GIF, BMP, WEBP, DOC, DOCX, ODT, RTF, TXT, CSV, XLS, XLSX, PPT, PPTX, ODS, ODP.",
            ),
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 25 * 1024 * 1024 }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() body: UploadDocumentDto,
    @Req() req,
  ) {
    return this.documentsService.create(
      file,
      req.user.userId,
      file.mimetype,
      req.user.role,
      body.taskId,
    );
  }

  @Get()
  @Permissions()
  findAll(@Req() req) {
    return this.documentsService.findAll(req.user.userId, req.user.role);
  }

  @Get(":id/download")
  @Permissions()
  async download(
    @Param("id", ParseIntPipe) id: number,
    @Req() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.documentsService.getDownloadPayload(
      id,
      req.user.userId,
      req.user.role,
    );

    res.setHeader("Content-Type", file.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
    );

    return new StreamableFile(file.stream);
  }

  @Get(":id")
  @Permissions()
  findOne(@Param("id") id: string, @Req() req) {
    return this.documentsService.findOne(id, req.user.userId, req.user.role);
  }

  @Patch(":id")
  @Permissions()
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @Req() req,
  ) {
    return this.documentsService.update(
      id,
      updateDocumentDto,
      req.user.userId,
      req.user.role,
    );
  }

  @Patch(":id/grade")
  @Permissions()
  grade(
    @Param("id", ParseIntPipe) id: number,
    @Body() gradeDocumentDto: GradeDocumentDto,
    @Req() req,
  ) {
    return this.documentsService.grade(
      id,
      gradeDocumentDto,
      req.user.userId,
      req.user.role,
    );
  }

  @Delete(":id")
  @Permissions()
  remove(@Param("id") id: string, @Req() req) {
    return this.documentsService.remove(id, req.user.userId, req.user.role);
  }
}
