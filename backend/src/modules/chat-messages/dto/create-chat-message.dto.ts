import { IsInt, IsNotEmpty, IsString, IsOptional } from "class-validator";

export class CreateChatMessageDto {
  @IsInt() @IsNotEmpty() room_id: number;
  @IsInt() @IsNotEmpty() user_id: number;
  @IsString() @IsOptional() message?: string;
  @IsString() @IsOptional() file_path?: string;
}
