import { Module } from "@nestjs/common";
import { ClassesTeachersController } from "./classes-teachers.controller";
import { ClassesTeachersService } from "./classes-teachers.service";

@Module({
  controllers: [ClassesTeachersController],
  providers: [ClassesTeachersService],
})
export class ClassesTeachersModule {}
