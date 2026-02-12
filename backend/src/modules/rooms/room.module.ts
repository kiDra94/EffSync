import { Module } from "@nestjs/common";
import { ClassesService } from "./room.service";
import { ClassesController } from "./room.controller";

@Module({
  controllers: [ClassesController],
  providers: [ClassesService],
})
export class ClassesModule {}
