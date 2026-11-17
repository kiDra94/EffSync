import {
  IsIn,
  IsString,
  IsArray,
  IsOptional,
  ValidateNested,
  ValidateIf,
  ArrayMinSize,
  ArrayMaxSize,
} from "class-validator";
import { Type } from "class-transformer";

export class ConditionNodeDto {
  @IsIn(["leaf", "operator"])
  type: "leaf" | "operator";

  @ValidateIf((o: ConditionNodeDto) => o.type === "leaf")
  @IsString()
  task_id?: string;

  @ValidateIf((o: ConditionNodeDto) => o.type === "operator")
  @IsIn(["AND", "OR", "XOR", "NOT"])
  operator?: string;

  @ValidateIf((o: ConditionNodeDto) => o.type === "operator")
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConditionNodeDto)
  @ArrayMinSize(1) // at least 1 for NOT, at least 2 for the others
  operands?: ConditionNodeDto[];
}
