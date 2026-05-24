import { Injectable } from '@nestjs/common';
import {
  freezeTransactionLine,
  freezeTransactionTotals,
  type FrozenTransactionLine,
  type FrozenTransactionTotals,
  type TransactionLineInput,
} from '@flp/shared';
import { TasaBcvService } from '../../modules/tasa-bcv/tasa-bcv.service';

/**
 * Servicio de congelación de montos bimonetarios para Compras y Ventas.
 * Regla de Oro: captura tasaBcvMomento al registrar la transacción.
 */
@Injectable()
export class TransactionFreezeService {
  constructor(private readonly tasaBcvService: TasaBcvService) {}

  async getTasaBcvMomento(): Promise<number> {
    return this.tasaBcvService.getTasaParaTransaccion();
  }

  freezeLine(
    input: TransactionLineInput,
    tasaBcvMomento: number,
  ): FrozenTransactionLine {
    return freezeTransactionLine(input, tasaBcvMomento);
  }

  freezeDocument(
    lines: FrozenTransactionLine[],
    tasaBcvMomento: number,
    options?: { taxUsd?: number; discountUsd?: number },
  ): FrozenTransactionTotals {
    return freezeTransactionTotals(lines, tasaBcvMomento, options);
  }

  async freezeDocumentWithCurrentRate(
    lines: TransactionLineInput[],
    options?: { taxUsd?: number; discountUsd?: number },
  ): Promise<{ tasaBcvMomento: number; lines: FrozenTransactionLine[]; totals: FrozenTransactionTotals }> {
    const tasaBcvMomento = await this.getTasaBcvMomento();
    return this.freezeDocumentWithRate(lines, tasaBcvMomento, options);
  }

  freezeDocumentWithRate(
    lines: TransactionLineInput[],
    tasaBcvMomento: number,
    options?: { taxUsd?: number; discountUsd?: number },
  ): { tasaBcvMomento: number; lines: FrozenTransactionLine[]; totals: FrozenTransactionTotals } {
    const frozenLines = lines.map((l) => this.freezeLine(l, tasaBcvMomento));
    const totals = this.freezeDocument(frozenLines, tasaBcvMomento, options);
    return { tasaBcvMomento, lines: frozenLines, totals };
  }
}
