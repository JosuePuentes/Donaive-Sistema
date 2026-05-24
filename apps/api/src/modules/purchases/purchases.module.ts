import { Module } from '@nestjs/common';
import { PurchasesController } from './purchases.controller';
import { CxpController } from './cxp.controller';
import { PurchasesService } from './purchases.service';
import { CxpService } from './cxp.service';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  controllers: [PurchasesController, CxpController],
  providers: [PurchasesService, CxpService],
  exports: [PurchasesService, CxpService],
})
export class PurchasesModule {}
