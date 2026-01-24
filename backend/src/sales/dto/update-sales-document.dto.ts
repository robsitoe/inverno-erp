import { PartialType } from '@nestjs/swagger';
import { CreateSalesDocumentDto } from './create-sales-document.dto';

export class UpdateSalesDocumentDto extends PartialType(CreateSalesDocumentDto) { }
