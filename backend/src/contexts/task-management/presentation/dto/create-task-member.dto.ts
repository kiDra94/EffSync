import { IsNumber, Min } from "class-validator";
import { Type } from "class-transformer";

/**
 * DTO for adding a user to a task.
 *
 * Example:
 * {
 *   "user_id": 123
 * }
 */
export class CreateTaskMemberDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  user_id: number;
}
