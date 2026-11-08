import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  JwtAuthGuard,
  Permissions,
  PermissionsGuard,
} from "../../../shared/presentation/security";
import type { AuthenticatedRequest } from "../../../shared/presentation/security";
import { NotesService } from "../application/notes.service";
import { CreateNoteDto } from "./dto/create-note.dto";
import { UpdateNoteDto } from "./dto/update-note.dto";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("notes")
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  private getUserId(req: AuthenticatedRequest): number {
    const userId = req?.user?.userId ?? req?.user?.id;
    if (!userId) {
      throw new BadRequestException("Missing authenticated user id");
    }
    return userId;
  }

  @Post()
  @Permissions("view_dashboard")
  create(@Body() dto: CreateNoteDto, @Req() req: AuthenticatedRequest) {
    return this.notesService.create(dto, this.getUserId(req));
  }

  @Get()
  @Permissions("view_dashboard")
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query("subject_id") subjectId?: string,
  ) {
    const parsedId = subjectId ? parseInt(subjectId, 10) : undefined;
    return this.notesService.findAll(this.getUserId(req), parsedId);
  }

  @Get(":id")
  @Permissions("view_dashboard")
  findOne(
    @Param("id", ParseIntPipe) noteId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.notesService.findOne(noteId, this.getUserId(req));
  }

  @Patch(":id")
  @Permissions("view_dashboard")
  update(
    @Param("id", ParseIntPipe) noteId: number,
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.notesService.update(noteId, this.getUserId(req), dto);
  }

  @Delete(":id")
  @Permissions("view_dashboard")
  remove(
    @Param("id", ParseIntPipe) noteId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.notesService.remove(noteId, this.getUserId(req));
  }
}
