import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { BranchStockService } from '../services/branch-stock.service';

@Global()
@Module({
  providers: [PrismaService, BranchStockService],
  exports: [PrismaService, BranchStockService],
})
export class PrismaModule {}
