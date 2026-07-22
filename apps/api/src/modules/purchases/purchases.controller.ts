import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';
import { CreatePurchaseDto } from './dto/purchase.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { BranchStockService } from '../../common/services/branch-stock.service';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PurchasesController {
  constructor(
    private readonly purchasesService: PurchasesService,
    private readonly branchStock: BranchStockService,
  ) {}

  @Get('suppliers')
  @RequirePermissions('SUPPLIERS_VIEW', 'PURCHASES_CREATE')
  findAllSuppliers(@Query('includeInactive') includeInactive?: string) {
    return this.purchasesService.findAllSuppliers(includeInactive === 'true');
  }

  @Get('suppliers/:id')
  @RequirePermissions('SUPPLIERS_VIEW', 'PURCHASES_CREATE')
  findSupplier(@Param('id') id: string) {
    return this.purchasesService.findSupplierById(id);
  }

  @Post('suppliers')
  @RequirePermissions('SUPPLIERS_MANAGE')
  createSupplier(@Body() dto: CreateSupplierDto) {
    return this.purchasesService.createSupplier(dto);
  }

  @Patch('suppliers/:id')
  @RequirePermissions('SUPPLIERS_MANAGE')
  updateSupplier(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.purchasesService.updateSupplier(id, dto);
  }

  @Get('purchases')
  @RequirePermissions('PURCHASES_VIEW')
  findAllPurchases(@CurrentUser() user: AuthenticatedUser) {
    return this.purchasesService.findAllPurchases(user.branchId);
  }

  @Get('purchases/:id')
  @RequirePermissions('PURCHASES_VIEW')
  findPurchase(@Param('id') id: string) {
    return this.purchasesService.findPurchaseById(id);
  }

  @Post('purchases')
  @RequirePermissions('PURCHASES_CREATE')
  createPurchase(@Body() dto: CreatePurchaseDto, @CurrentUser() user: AuthenticatedUser) {
    const branchId = this.branchStock.requireBranchId(user.branchId);
    return this.purchasesService.createAndConfirmPurchase(dto, user.id, branchId);
  }
}
