import {
    IsIn, IsString, IsArray, IsOptional,
    ValidateNested, ValidateIf, ArrayMinSize, ArrayMaxSize
} from 'class-validator';
import { Type } from 'class-transformer';

export class ConditionNodeDto {
    @IsIn(['leaf', 'operator'])
    type: 'leaf' | 'operator';

    @ValidateIf(o => o.type === 'leaf')
    @IsString()
    task_id?: string;

    @ValidateIf(o => o.type === 'operator')
    @IsIn(['AND', 'OR', 'XOR', 'NOT'])
    operator?: string;

    @ValidateIf(o => o.type === 'operator')
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ConditionNodeDto)
    @ArrayMinSize(1) // mind. 1 für NOT, mind. 2 für den Rest
    operands?: ConditionNodeDto[];

}
