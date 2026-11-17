import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { RoomRepository } from "./ports/school-catalog.repository";
import type { RoomInput } from "./school-inputs";

/** Rooms (T26, M36): managed with manage_classes, read by everyone. */
@Injectable()
export class RoomsService {
  constructor(private readonly rooms: RoomRepository) {}

  create(input: RoomInput & { name: string }) {
    return this.rooms.create(input);
  }

  findAll() {
    return this.rooms.findAll();
  }

  async findOne(id: number) {
    const found = await this.rooms.findById(id);
    if (!found) throw new NotFoundException(`Raum ${id} nicht gefunden`);
    return found;
  }

  async update(id: number, input: RoomInput) {
    await this.findOne(id);
    return this.rooms.update(id, input);
  }

  async remove(id: number) {
    await this.findOne(id);
    if (!(await this.rooms.delete(id))) {
      throw new ConflictException(
        `Raum ${id} wird noch verwendet (von Unterrichtsstunden)`,
      );
    }
    return { message: "Raum gelöscht", room_id: id };
  }
}
