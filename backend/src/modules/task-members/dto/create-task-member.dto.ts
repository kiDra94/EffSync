import { IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO zum Hinzufügen eines Benutzers zu einer Task.
 * 
 * Beispiel:
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
