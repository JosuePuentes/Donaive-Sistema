import { Controller, Get, Post, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions, PosOnly } from '../../common/decorators/permissions.decorator';
import { CalculateLineItemDto } from './dto/calculate-line-item.dto';

@Controller('pricing')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('exchange-rate/current')
  @RequirePermissions('EXCHANGE_RATE_VIEW')
  async getCurrentRate() {
    const montoBs = await this.pricingService.getCurrentExchangeRate();
    return {
      montoBs,
      usdToVes: montoBs,
      tasaBcvMomento: montoBs,
      currency: { base: 'USD', transaction: 'VES' },
    };
  }

  @Get('products/:productId')
  @PosOnly()
  async getProductPrice(
    @Param('productId') productId: string,
    @Query('exchangeRate') exchangeRate?: string,
    @Query('tasaBcvMomento') tasaBcvMomento?: string,
  ) {
    const rate = tasaBcvMomento ?? exchangeRate;
    return this.pricingService.getProductPrice({
      productId,
      tasaBcvMomento: rate ? parseFloat(rate) : undefined,
    });
  }

  @Post('products/bulk')
  @PosOnly()
  async getBulkPrices(
    @Body() body: { productIds: string[]; exchangeRate?: number; tasaBcvMomento?: number },
  ) {
    return this.pricingService.getBulkProductPrices({
      productIds: body.productIds,
      tasaBcvMomento: body.tasaBcvMomento ?? body.exchangeRate,
    });
  }

  @Post('calculate-line')
  @RequirePermissions('INVOICES_CREATE', 'PURCHASES_CREATE', 'POS_SELL')
  calculateLine(@Body() dto: CalculateLineItemDto) {
    const tasa = dto.tasaBcvMomento ?? dto.exchangeRate;
    if (tasa == null) {
      throw new BadRequestException('Debe indicar tasaBcvMomento o exchangeRate');
    }
    return this.pricingService.calculateLineItem(
      dto.unitPriceUsd,
      dto.quantity,
      tasa,
      dto.discountUsd,
    );
  }
}
