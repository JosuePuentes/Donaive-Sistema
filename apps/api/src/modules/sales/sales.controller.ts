import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreatePosSaleDto } from './dto/pos-sale.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions, RequireAllPermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { BranchStockService } from '../../common/services/branch-stock.service';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SalesController {
  constructor(
    private readonly salesService: SalesService,
    private readonly branchStock: BranchStockService,
  ) {}

  @Get('pos/products')
  @RequirePermissions('POS_ACCESS', 'PRODUCTS_VIEW')
  searchPosProducts(
    @Query('search') search: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const branchId = this.branchStock.requireBranchId(user.branchId);
    return this.salesService.searchPosProducts(search ?? '', branchId);
  }

  @Get('sales/resumen')
  @RequirePermissions('INVOICES_VIEW', 'REPORTS_DAILY_SALES')
  getVentasResumen(@CurrentUser() user: AuthenticatedUser) {
    return this.salesService.getVentasResumen(user.branchId);
  }

  @Get('sales')
  @RequirePermissions('INVOICES_VIEW', 'REPORTS_DAILY_SALES')
  findRecentSales(@CurrentUser() user: AuthenticatedUser) {
    return this.salesService.findRecentSales(user.branchId);
  }

  @Post('pos/sales')
  @RequireAllPermissions('POS_ACCESS', 'POS_SELL')
  createPosSale(@Body() dto: CreatePosSaleDto, @CurrentUser() user: AuthenticatedUser) {
    const branchId = this.branchStock.requireBranchId(user.branchId);
    return this.salesService.createPosSale(dto, user.id, branchId);
  }
}
