import { IsBoolean, IsInt, IsOptional, IsString } from "class-validator";

export class CreateChatRoomDto {
  @IsString() @IsOptional() name?: string;
  @IsInt() @IsOptional() task_id?: number;
  @IsInt() @IsOptional() class_id?: number;
  @IsBoolean() @IsOptional() is_private?: boolean;
  @IsString() @IsOptional() direct_chat_has?: string;
}
