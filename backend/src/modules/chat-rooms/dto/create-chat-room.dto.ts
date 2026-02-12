import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateChatRoomDto {
  @IsString() @IsOptional() name?: string;
  @IsInt() @IsOptional() task_id?: number;
  @IsInt() @IsOptional() class_id?: number;
}