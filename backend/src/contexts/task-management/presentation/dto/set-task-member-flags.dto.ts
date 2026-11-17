import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Max, Min } from "class-validator";

/** A member's rights on the task (T99, decision I4, M38). */
export class SetTaskMemberFlagsDto {
  @ApiProperty({
    example: 6,
    description:
      "4 = READ (see the members), 2 = WRITE (add and remove them), 1 = EXECUTE (change flags)",
  })
  @IsInt()
  @Min(0)
  @Max(7)
  flags: number;
}
