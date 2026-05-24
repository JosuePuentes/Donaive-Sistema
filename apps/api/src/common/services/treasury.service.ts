import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

/**
 * Movimientos de saldo en cuentas bancarias vinculadas a DocumentPayment.
 * amount positivo = ingreso; negativo = egreso.
 */
@Injectable()
export class TreasuryService {
  async applyMovement(
    tx: Prisma.TransactionClient,
    bankAccountId: string | null | undefined,
    amount: number,
  ): Promise<void> {
    if (!bankAccountId || amount === 0) return;
    await tx.bankAccount.update({
      where: { id: bankAccountId },
      data: { balance: { increment: amount } },
    });
  }
}
