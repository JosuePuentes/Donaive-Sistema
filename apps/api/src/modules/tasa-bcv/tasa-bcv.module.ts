import { Module } from '@nestjs/common';
import { TasaBcvController, ExchangeRateLegacyController } from './tasa-bcv.controller';
import { TasaBcvService } from './tasa-bcv.service';

@Module({
  controllers: [TasaBcvController, ExchangeRateLegacyController],
  providers: [TasaBcvService],
  exports: [TasaBcvService],
})
export class TasaBcvModule {}
