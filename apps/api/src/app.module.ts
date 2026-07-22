import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { CurrencyModule } from './common/currency/currency.module';
import { AuthModule } from './modules/auth/auth.module';
import { TasaBcvModule } from './modules/tasa-bcv/tasa-bcv.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { HealthModule } from './modules/health/health.module';
import { ProductsModule } from './modules/products/products.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { BanksModule } from './modules/banks/banks.module';
import { SalesModule } from './modules/sales/sales.module';
import { CajaModule } from './modules/caja/caja.module';
import { ReportsModule } from './modules/reports/reports.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SettingsModule } from './modules/settings/settings.module';
import { CustomersModule } from './modules/customers/customers.module';
import { UsersModule } from './modules/users/users.module';
import { BranchesModule } from './modules/branches/branches.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule,
    CurrencyModule,
    AuthModule,
    TasaBcvModule,
    PricingModule,
    HealthModule,
    ProductsModule,
    InventoryModule,
    PurchasesModule,
    BanksModule,
    SalesModule,
    CajaModule,
    ReportsModule,
    PaymentsModule,
    SettingsModule,
    CustomersModule,
    UsersModule,
    BranchesModule,
  ],
})
export class AppModule {}
