import { PermissionFlag } from "../permissions/permissions.service";
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
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { STAFF_ROLES } from "../../config/role-permissions.config";
import { UpdateDocumentDto } from "./dto/update-document.dto";
import { GradeDocumentDto } from "./dto/grade-document.dto";
import { UploadDocumentDto } from "./dto/upload-document.dto";
import { Throttle } from "@nestjs/throttler";

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
  ".md",
  ".csv",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".ods",
  ".odp",
];

// check order token → role → permission (T97)
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller("documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post("upload")
  @Permissions("view_dashboard")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      fileFilter: (req, file, callback) => {
        const extension = extname(file.originalname || "").toLowerCase();

        if (!ALLOWED_UPLOAD_EXTENSIONS.includes(extension)) {
          callback(
            new BadRequestException(
              "Erlaubte Formate: PDF, JPG, JPEG, PNG, GIF, BMP, WEBP, DOC, DOCX, ODT, RTF, TXT, MD, CSV, XLS, XLSX, PPT, PPTX, ODS, ODP.",
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
        validators: [new MaxFileSizeValidator({ maxSize: 25 * 1024 * 1024 })],
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
  @Permissions("view_dashboard")
  findAll(@Req() req) {
    return this.documentsService.findAll(req.user.userId, req.user.role);
  }

  /**
   * GET /documents/my-grades
   * Returns all grades of the current student
   */
  @Get("my-grades")
  @Permissions("view_grades")
  async getMyGrades(@Req() req) {
    return this.documentsService.getMyGrades(req.user.userId);
  }

  /**
   * GET /documents/by-task/:taskId
   * Returns all documents linked to a task
   * Only for the task's teacher/admin or the document's uploader
   */
  @Get("by-task/:taskId")
  @Permissions("view_dashboard")
  async getDocumentsByTask(
    @Param("taskId", ParseIntPipe) taskId: number,
    @Req() req,
  ) {
    return this.documentsService.getDocumentsByTask(
      taskId,
      req.user.userId,
      req.user.role,
    );
  }

  @Get(":id/download")
  @Permissions("view_dashboard")
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
  @Permissions("view_dashboard")
  findOne(@Param("id") id: string, @Req() req) {
    return this.documentsService.findOne(id, req.user.userId, req.user.role);
  }

  @Patch(":id")
  @Permissions("view_dashboard")
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
  @Roles(...STAFF_ROLES)
  @Permissions("edit_grades", PermissionFlag.WRITE)
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

  /**
   * PATCH /documents/:id/allow-resubmit
   * Lets the student upload again - unlocks the task
   * Only a teacher may do this
   */
  @Patch(":id/allow-resubmit")
  @Roles(...STAFF_ROLES)
  @Permissions("edit_grades", PermissionFlag.WRITE)
  allowResubmit(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { new_deadline?: string },
    @Req() req,
  ) {
    return this.documentsService.allowResubmit(
      id,
      body.new_deadline ? new Date(body.new_deadline) : undefined,
      req.user.userId,
      req.user.role,
    );
  }

  @Delete(":id")
  @Permissions("view_dashboard")
  remove(@Param("id") id: string, @Req() req) {
    return this.documentsService.remove(id, req.user.userId, req.user.role);
  }
}
