import { PermissionFlag } from "../../identity-access/application";
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
} from "@nestjs/common";
import { RoomsService } from "../application/room.service";
import { CreateRoomDto } from "./dto/create-room.dto";
import { UpdateRoomDto } from "./dto/update-room.dto";
import {
  JwtAuthGuard,
  PermissionsGuard,
  Permissions,
} from "../../../shared/presentation/security";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("rooms")
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @Permissions("manage_classes", PermissionFlag.WRITE)
  create(@Body() createRoomDto: CreateRoomDto) {
    return this.roomsService.create(createRoomDto);
  }

  @Get()
  @Permissions("view_schedules")
  findAll() {
    return this.roomsService.findAll();
  }

  @Get(":id")
  @Permissions("view_schedules")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.roomsService.findOne(id);
  }

  @Patch(":id")
  @Permissions("manage_classes", PermissionFlag.WRITE)
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateRoomDto: UpdateRoomDto,
  ) {
    return this.roomsService.update(id, updateRoomDto);
  }

  @Delete(":id")
  @Permissions("manage_classes", PermissionFlag.EXECUTE)
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.roomsService.remove(id);
  }
}
