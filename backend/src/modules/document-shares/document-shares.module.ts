import { Module } from "@nestjs/common";
import { DocumentSharesController } from "./document-shares.controller";
import { DocumentSharesService } from "./document-shares.service";

@Module({
  controllers: [DocumentSharesController],
  providers: [DocumentSharesService],
})
export class DocumentSharesModule {}
