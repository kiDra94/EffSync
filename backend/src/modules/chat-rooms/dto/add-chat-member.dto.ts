import { IsInt } from "class-validator";

export class AddChatMemberDto {
  @IsInt() userId: number;
}
