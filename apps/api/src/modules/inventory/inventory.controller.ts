import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import {
  ListMovementsQueryDto,
  CreateAdjustmentDto,
  CreateShrinkageDto,
} from './dto/inventory.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { BranchStockService } from '../../common/services/branch-stock.service';

@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly branchStock: BranchStockService,
  ) {}

  @Get('movements')
  @RequirePermissions('INVENTORY_VIEW')
  findMovements(
    @Query() query: ListMovementsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryService.findMovements(query, user.branchId);
  }

  @Get('products/:productId/kardex')
  @RequirePermissions('INVENTORY_VIEW')
  findKardex(
    @Param('productId') productId: string,
    @Query() query: ListMovementsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryService.findKardexByProduct(productId, query, user.branchId);
  }

  @Get('summary')
  @RequirePermissions('INVENTORY_VIEW')
  getStockSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.inventoryService.getStockSummary(user.branchId);
  }

  @Get('adjustments')
  @RequirePermissions('INVENTORY_VIEW')
  findAdjustments(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.inventoryService.findAdjustments(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      user?.branchId,
    );
  }

  @Get('adjustments/:id')
  @RequirePermissions('INVENTORY_VIEW')
  findAdjustment(@Param('id') id: string) {
    return this.inventoryService.findAdjustment(id);
  }

  @Post('adjustments')
  @RequirePermissions('INVENTORY_ADJUST')
  createAdjustment(
    @Body() dto: CreateAdjustmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const branchId = this.branchStock.requireBranchId(user.branchId);
    return this.inventoryService.createAdjustment(dto, user.id, branchId);
  }

  @Post('shrinkage')
  @RequirePermissions('INVENTORY_SHRINKAGE')
  createShrinkage(
    @Body() dto: CreateShrinkageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const branchId = this.branchStock.requireBranchId(user.branchId);
    return this.inventoryService.createShrinkage(dto, user.id, branchId);
  }
}
