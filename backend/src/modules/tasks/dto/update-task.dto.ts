import { PartialType } from "@nestjs/mapped-types";
import { CreateTaskDto } from "./create-task.dto";
import { Type } from "class-transformer";
import { IsOptional, IsBoolean, ValidateNested } from "class-validator";
import { ConditionNodeDto } from "./condition-node.dto";

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
    @IsOptional()
    @IsBoolean()
    auto_complete?: boolean;

    @IsOptional()
    @ValidateNested()
    @Type(() => ConditionNodeDto)
    completion_rule?: ConditionNodeDto;
}
