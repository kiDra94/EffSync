import { PartialType } from "@nestjs/mapped-types";
import { CreateTaskDto } from "./create-task.dto";
import { Type } from "class-transformer";
import { IsOptional, IsBoolean, IsString, IsDateString, ValidateNested } from "class-validator";
import { ConditionNodeDto } from "./condition-node.dto";

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
    @IsOptional()
    @IsBoolean()
    auto_complete?: boolean;

    // Note: lock fields are intentionally ignored in TasksService.update()
    // and should be changed only via dedicated lock/unlock endpoints.
    @IsOptional()
    @IsBoolean()
    is_locked?: boolean;

    @IsOptional()
    @IsString()
    locked_reason?: string;

    @IsOptional()
    @IsDateString()
    locked_until?: Date;

    @IsOptional()
    @ValidateNested()
    @Type(() => ConditionNodeDto)
    completion_rule?: ConditionNodeDto;
}
