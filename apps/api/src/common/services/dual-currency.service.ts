import { Injectable } from '@nestjs/common';
import { usdToVes, calculateProductPricing } from '@flp/shared';
import { TasaBcvService, type TasaBcvActual } from '../../modules/tasa-bcv/tasa-bcv.service';

export interface ProductDualCurrencyFields {
  costUsd: number;
  marginPercent: number;
  salePriceUsd: number;
  salePriceVes: number;
  costVes: number;
  tasaBcvActual: number;
  tasaBcvFecha: string;
}

@Injectable()
export class DualCurrencyService {
  constructor(private readonly tasaBcvService: TasaBcvService) {}

  async enrichProduct<T extends { costUsd: number; marginPercent: number; salePriceUsd: number }>(
    product: T,
    tasa?: TasaBcvActual,
  ): Promise<T & ProductDualCurrencyFields> {
    const tasaActual = tasa ?? (await this.tasaBcvService.getTasaActual());
    const pricing = calculateProductPricing(
      { costUsd: product.costUsd, marginPercent: product.marginPercent },
      tasaActual.montoBs,
    );

    return {
      ...product,
      salePriceUsd: pricing.salePriceUsd,
      salePriceVes: pricing.salePriceVes,
      costVes: usdToVes(product.costUsd, tasaActual.montoBs),
      tasaBcvActual: tasaActual.montoBs,
      tasaBcvFecha: tasaActual.fecha.toISOString().split('T')[0],
    };
  }

  async enrichProducts<T extends { costUsd: number; marginPercent: number; salePriceUsd: number }>(
    products: T[],
  ): Promise<Array<T & ProductDualCurrencyFields>> {
    const tasa = await this.tasaBcvService.getTasaActual();
    return Promise.all(products.map((p) => this.enrichProduct(p, tasa)));
  }
}
