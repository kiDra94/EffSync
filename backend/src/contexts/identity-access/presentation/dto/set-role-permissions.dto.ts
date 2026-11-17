import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

/** One permission of the role and its R/W/X flags (decision I2: the permission's, for every role). */
class RolePermissionEntryDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  permission_id: number;

  @ApiProperty({
    example: 6,
    required: false,
    description:
      "4 = READ, 2 = WRITE, 1 = EXECUTE; left out, the permission keeps its flags",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(7)
  flags?: number;
}

/** PUT /roles/:id/permissions (T77, decision Q18, M35): the role's whole permission set. */
export class SetRolePermissionsDto {
  @ApiProperty({ type: [RolePermissionEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RolePermissionEntryDto)
  permissions: RolePermissionEntryDto[];
}
