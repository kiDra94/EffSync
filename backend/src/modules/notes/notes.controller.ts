import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
  Query,
  ParseIntPipe,
} from "@nestjs/common";
import { NotesService } from "./notes.service";
import { CreateNoteDto } from "./dto/create-note.dto";
import { UpdateNoteDto } from "./dto/update-note.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Permissions } from "../auth/decorators/permissions.decorator";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("notes")
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  private getUserId(req: any): number {
    const userId = req?.user?.userId ?? req?.user?.id;
    if (!userId) {
      throw new BadRequestException("Missing authenticated user id");
    }
    return userId;
  }

  @Post()
  @Permissions("view_dashboard")
  create(@Body() createNoteDto: CreateNoteDto, @Req() req) {
    return this.notesService.create(createNoteDto, this.getUserId(req));
  }

  @Get()
  @Permissions("view_dashboard")
  findAll(@Req() req, @Query("subject_id") subjectId?: string) {
    const parsedId = subjectId ? parseInt(subjectId, 10) : undefined;
    return this.notesService.findAll(this.getUserId(req), parsedId);
  }

  @Get(":id")
  @Permissions("view_dashboard")
  findOne(@Param("id", ParseIntPipe) noteId: number, @Req() req) {
    return this.notesService.findOne(noteId, this.getUserId(req));
  }

  @Patch(":id")
  @Permissions("view_dashboard")
  update(
    @Param("id", ParseIntPipe) noteId: number,
    @Req() req,
    @Body() updateNoteDto: UpdateNoteDto,
  ) {
    return this.notesService.update(noteId, this.getUserId(req), updateNoteDto);
  }

  @Delete(":id")
  @Permissions("view_dashboard")
  remove(@Param("id", ParseIntPipe) noteId: number, @Req() req) {
    return this.notesService.remove(noteId, this.getUserId(req));
  }
}
