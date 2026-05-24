import { Module } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { PricingController } from './pricing.controller';
import { TasaBcvModule } from '../tasa-bcv/tasa-bcv.module';

@Module({
  imports: [TasaBcvModule],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}