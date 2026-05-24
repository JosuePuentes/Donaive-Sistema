import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreatePosSaleDto } from './dto/pos-sale.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions, RequireAllPermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get('sales')
  @RequirePermissions('INVOICES_VIEW', 'REPORTS_DAILY_SALES')
  findRecentSales() {
    return this.salesService.findRecentSales();
  }

  @Post('pos/sales')
  @RequireAllPermissions('POS_ACCESS', 'POS_SELL')
  createPosSale(@Body() dto: CreatePosSaleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.salesService.createPosSale(dto, user.id);
  }
}
