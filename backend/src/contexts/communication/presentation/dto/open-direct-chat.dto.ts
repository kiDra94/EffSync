import { IsInt, Min } from "class-validator";

/** The other person of a direct chat (T113). */
export class OpenDirectChatDto {
  @IsInt()
  @Min(1)
  user_id!: number;
}
