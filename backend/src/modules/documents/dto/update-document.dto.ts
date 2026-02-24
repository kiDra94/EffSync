import { PartialType } from "@nestjs/mapped-types";
import { CreateDocumentDto } from "./create-document.dto";

// PartialType sorgt dafür, dass alle Felder aus CreateDocumentDto optional werden
export class UpdateDocumentDto extends PartialType(CreateDocumentDto) {}
