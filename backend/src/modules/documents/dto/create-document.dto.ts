import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateDocumentDto {
  @IsNotEmpty()
  @IsString()
  userId: string; // NestJS empfängt Body-Daten meist als String
  @IsNumber()
  added_by: number; // Direkt den Namen aus dem Prisma-Schema nutzen
}