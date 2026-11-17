import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import { memoryStorage } from "multer";
import { PermissionFlag, STAFF_ROLES } from "../../identity-access/application";
import {
  JwtAuthGuard,
  Permissions,
  PermissionsGuard,
  Roles,
  RolesGuard,
} from "../../../shared/presentation/security";
import type { AuthenticatedRequest } from "../../../shared/presentation/security";
import { DocumentGradingService } from "../application/document-grading.service";
import { DocumentQueriesService } from "../application/document-queries.service";
import { DocumentUploadsService } from "../application/document-uploads.service";
import { ALLOWED_EXTENSIONS, extensionOf } from "../domain/file-type";
import { AllowResubmitDto } from "./dto/allow-resubmit.dto";
import { GradeDocumentDto } from "./dto/grade-document.dto";
import { UpdateDocumentDto } from "./dto/update-document.dto";
import { UploadDocumentDto } from "./dto/upload-document.dto";

// check order token → role → permission (T97)
@ApiTags("documents")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Kein oder ungültiges Token" })
@ApiForbiddenResponse({ description: "Fehlende Rolle oder Berechtigung" })
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller("documents")
export class DocumentsController {
  constructor(
    private readonly queries: DocumentQueriesService,
    private readonly uploads: DocumentUploadsService,
    private readonly grading: DocumentGradingService,
  ) {}

  @ApiOperation({
    summary:
      "Upload a document (PDF, images, Office; max. 25 MB), optionally for a task",
  })
  @Post("upload")
  @Permissions("view_dashboard")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      fileFilter: (req, file, callback) => {
        if (!ALLOWED_EXTENSIONS.has(extensionOf(file.originalname || ""))) {
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
  uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 25 * 1024 * 1024 })],
      }),
    )
    file: Express.Multer.File,
    @Body() body: UploadDocumentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.uploads.create(
      file,
      req.user.userId,
      file.mimetype,
      req.user.role,
      body.taskId,
    );
  }

  @ApiOperation({ summary: "The documents the requester may see" })
  @Get()
  @Permissions("view_dashboard")
  findAll(@Req() req: AuthenticatedRequest) {
    return this.queries.findAll(req.user.userId, req.user.role);
  }

  /** The current student's grades. */
  @ApiOperation({ summary: "The current student's grades." })
  @Get("my-grades")
  @Permissions("view_grades")
  getMyGrades(@Req() req: AuthenticatedRequest) {
    return this.queries.getMyGrades(req.user.userId);
  }

  /** The documents linked to a task: for staff and the task's creator. */
  @ApiOperation({
    summary:
      "The documents linked to a task: for staff and the task's creator.",
  })
  @Get("by-task/:taskId")
  @Permissions("view_dashboard")
  getDocumentsByTask(
    @Param("taskId", ParseIntPipe) taskId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.queries.getDocumentsByTask(
      taskId,
      req.user.userId,
      req.user.role,
    );
  }

  @ApiOperation({ summary: "Download a document" })
  @Get(":id/download")
  @Permissions("view_dashboard")
  async download(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.queries.getDownloadPayload(
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

  @ApiOperation({ summary: "One document" })
  @Get(":id")
  @Permissions("view_dashboard")
  findOne(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.queries.findOne(id, req.user.userId, req.user.role);
  }

  @ApiOperation({ summary: "Rename a document" })
  @Patch(":id")
  @Permissions("view_dashboard")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateDocumentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.uploads.update(id, dto, req.user.userId, req.user.role);
  }

  @ApiOperation({ summary: "Grade a student's document (staff)" })
  @Patch(":id/grade")
  @Roles(...STAFF_ROLES)
  @Permissions("edit_grades", PermissionFlag.WRITE)
  grade(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: GradeDocumentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.grading.grade(id, dto, req.user.userId, req.user.role);
  }

  /** Lets the student upload again: unlocks the task (staff only). */
  @ApiOperation({
    summary: "Lets the student upload again: unlocks the task (staff only).",
  })
  @Patch(":id/allow-resubmit")
  @Roles(...STAFF_ROLES)
  @Permissions("edit_grades", PermissionFlag.WRITE)
  allowResubmit(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: AllowResubmitDto,
  ) {
    return this.grading.allowResubmit(
      id,
      body.new_deadline ? new Date(body.new_deadline) : undefined,
    );
  }

  @ApiOperation({ summary: "Delete a document" })
  @Delete(":id")
  @Permissions("view_dashboard")
  remove(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.uploads.remove(id, req.user.userId, req.user.role);
  }
}
