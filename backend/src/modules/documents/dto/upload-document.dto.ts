import { Type } from "class-transformer";
import { IsInt, IsOptional } from "class-validator";

export class UploadDocumentDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  taskId?: number;
}
