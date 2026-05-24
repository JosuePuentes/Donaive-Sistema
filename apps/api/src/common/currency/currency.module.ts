import { Global, Module } from '@nestjs/common';
import { TasaBcvModule } from '../../modules/tasa-bcv/tasa-bcv.module';
import { DualCurrencyService } from '../services/dual-currency.service';
import { TransactionFreezeService } from '../services/transaction-freeze.service';
import { TreasuryService } from '../services/treasury.service';
import { TasaBcvInterceptor } from '../interceptors/tasa-bcv.interceptor';

@Global()
@Module({
  imports: [TasaBcvModule],
  providers: [DualCurrencyService, TransactionFreezeService, TreasuryService, TasaBcvInterceptor],
  exports: [DualCurrencyService, TransactionFreezeService, TreasuryService, TasaBcvInterceptor, TasaBcvModule],
})
export class CurrencyModule {}
