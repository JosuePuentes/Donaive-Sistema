import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { DocumentNumberService } from '../../common/services/document-number.service';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService, DocumentNumberService],
  exports: [InventoryService],
})
export class InventoryModule {}
