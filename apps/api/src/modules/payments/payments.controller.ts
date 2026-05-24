import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('payments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('history')
  @RequirePermissions('PURCHASES_VIEW', 'INVOICES_VIEW', 'REPORTS_DAILY_SALES', 'ACCOUNTS_PAYABLE_VIEW')
  getHistory(
    @Query('limit') limit?: string,
    @Query('type') type?: 'sales' | 'purchases',
  ) {
    const parsed = limit ? parseInt(limit, 10) : 100;
    return this.paymentsService.findDocumentPayments(
      Number.isNaN(parsed) ? 100 : parsed,
      type,
    );
  }

  @Get('supplier-abonos')
  @RequirePermissions('ACCOUNTS_PAYABLE_VIEW', 'PURCHASES_VIEW')
  getSupplierAbonos(@Query('limit') limit?: string) {
    const parsed = limit ? parseInt(limit, 10) : 100;
    return this.paymentsService.findSupplierPayments(Number.isNaN(parsed) ? 100 : parsed);
  }
}
