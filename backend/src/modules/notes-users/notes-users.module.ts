import { Module } from "@nestjs/common";
import { NotesUsersController } from "./notes-users.controller";
import { NotesUsersService } from "./notes-users.service";

@Module({
  controllers: [NotesUsersController],
  providers: [NotesUsersService],
})
export class NotesUsersModule {}
