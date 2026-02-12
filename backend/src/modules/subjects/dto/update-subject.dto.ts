import { PartialType } from "@nestjs/mapped-types";
import { CreateTaskActivityDto } from "./create-subject.dto";

export class UpdateTaskActivityDto extends PartialType(CreateTaskActivityDto) {}
