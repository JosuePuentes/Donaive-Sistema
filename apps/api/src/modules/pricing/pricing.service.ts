import { Injectable, NotFoundException } from '@nestjs/common';
import {
  calculateProductPricing,
  calculateLineItemPricing,
  calculateWeightedAverageCost,
  calculateGrossProfit,
  type ProductPricingResult,
  type LineItemPricingResult,
} from '@flp/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TasaBcvService } from '../tasa-bcv/tasa-bcv.service';

export interface ProductPriceQuery {
  productId: string;
  tasaBcvMomento?: number;
}

export interface BulkPriceQuery {
  productIds: string[];
  tasaBcvMomento?: number;
}

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tasaBcvService: TasaBcvService,
  ) {}

  async getCurrentExchangeRate(): Promise<number> {
    return this.tasaBcvService.getTasaParaTransaccion();
  }

  async getProductPrice(
    query: ProductPriceQuery,
  ): Promise<ProductPricingResult & { productId: string; tasaBcvMomento: number; exchangeRate: number }> {
    const product = await this.prisma.product.findUnique({
      where: { id: query.productId },
    });

    if (!product) {
      throw new NotFoundException(`Producto ${query.productId} no encontrado`);
    }

    const tasaBcvMomento = query.tasaBcvMomento ?? (await this.getCurrentExchangeRate());

    const pricing = calculateProductPricing(
      { costUsd: Number(product.costUsd), marginPercent: Number(product.marginPercent) },
      tasaBcvMomento,
    );

    return { productId: product.id, tasaBcvMomento, exchangeRate: tasaBcvMomento, ...pricing };
  }

  async getBulkProductPrices(query: BulkPriceQuery) {
    const tasaBcvMomento = query.tasaBcvMomento ?? (await this.getCurrentExchangeRate());

    const products = await this.prisma.product.findMany({
      where: { id: { in: query.productIds }, isActive: true },
    });

    return products.map((product) => ({
      productId: product.id,
      sku: product.sku,
      barcode: product.barcode,
      name: product.name,
      stock: Number(product.stock),
      tasaBcvMomento,
      exchangeRate: tasaBcvMomento,
      ...calculateProductPricing(
        { costUsd: Number(product.costUsd), marginPercent: Number(product.marginPercent) },
        tasaBcvMomento,
      ),
    }));
  }

  calculateLineItem(
    unitPriceUsd: number,
    quantity: number,
    tasaBcvMomento: number,
    discountUsd = 0,
  ): LineItemPricingResult {
    return calculateLineItemPricing({
      unitPriceUsd,
      quantity,
      discountUsd,
      exchangeRate: tasaBcvMomento,
    });
  }

  recalculateWeightedCost(
    currentStock: number,
    currentCostUsd: number,
    incomingQuantity: number,
    incomingCostUsd: number,
  ): number {
    return calculateWeightedAverageCost(
      currentStock,
      currentCostUsd,
      incomingQuantity,
      incomingCostUsd,
    );
  }

  calculateLineGrossProfit(
    unitSalePriceUsd: number,
    unitCostUsd: number,
    quantity: number,
  ): number {
    return calculateGrossProfit(unitSalePriceUsd, unitCostUsd, quantity);
  }
}
