import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { InventoryModule } from '../inventory/inventory.module';
import { CajaModule } from '../caja/caja.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [InventoryModule, CajaModule, ProductsModule],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}