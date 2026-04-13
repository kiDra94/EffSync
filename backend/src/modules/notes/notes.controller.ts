import {
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
  constructor(private readonly notesService: NotesService) { }

  @Post()
  @Permissions()
  create(@Body() createNoteDto: CreateNoteDto, @Req() req) {
    return this.notesService.create(createNoteDto, req.user.userId);
  }

  @Get()
  @Permissions()
  findAll(@Req() req, @Query('subject_id') subjectId?: string) {
    const parsedId = subjectId ? parseInt(subjectId, 10) : undefined;
    return this.notesService.findAll(req.user.userId, parsedId);
  }

  @Get(":id")
  @Permissions()
  findOne(@Param("id", ParseIntPipe) noteId: number) {
    return this.notesService.findOne(noteId);
  }

  @Patch(":id")
  @Permissions()
  update(@Param("id", ParseIntPipe) noteId: number, @Req() req, @Body() updateNoteDto: UpdateNoteDto) {
    return this.notesService.update(noteId, req.user.userId, updateNoteDto);
  }

  @Delete(":id")
  @Permissions()
  remove(@Param("id", ParseIntPipe) noteId: number, @Req() req) {
    return this.notesService.remove(noteId, req.user.userId);
  }
}
