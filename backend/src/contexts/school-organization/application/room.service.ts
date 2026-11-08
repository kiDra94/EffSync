import { Injectable } from "@nestjs/common";
import type { RoomInput } from "./school-inputs";

// a stub until M36 (school organization on the real API)
@Injectable()
export class RoomsService {
  create(createRoomDto: RoomInput) {
    return "This action adds a new room";
  }

  findAll() {
    return `This action returns all rooms`;
  }

  findOne(id: number) {
    return `This action returns a #${id} room`;
  }

  update(id: number, UpdateRoomDto: RoomInput) {
    return `This action updates a #${id} room`;
  }

  remove(id: number) {
    return `This action removes a #${id} room`;
  }
}
