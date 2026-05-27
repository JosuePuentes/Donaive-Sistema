import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { roundCurrency, type CurrencyCode } from '@flp/shared';

/**
 * Movimientos de saldo por método de pago y cuenta bancaria vinculada.
 * amount positivo = ingreso; negativo = egreso.
 */
@Injectable()
export class TreasuryService {
  async recordMovement(
    tx: Prisma.TransactionClient,
    paymentMethodId: string,
    amount: number,
    cachedMethod?: {
      id: string;
      name: string;
      currency: string;
      balance?: { toString(): string } | number;
      bankAccountId: string | null;
      isActive: boolean;
    },
  ): Promise<void> {
    if (amount === 0) return;

    const method =
      cachedMethod ??
      (await tx.paymentMethod.findUnique({
        where: { id: paymentMethodId },
        select: {
          id: true,
          name: true,
          currency: true,
          balance: true,
          bankAccountId: true,
          isActive: true,
        },
      }));

    if (!method || !method.isActive) {
      throw new BadRequestException('Método de pago no válido o inactivo');
    }

    const currency = method.currency as CurrencyCode;
    const normalizedAmount = roundCurrency(amount, currency);

    if (normalizedAmount < 0) {
      const available = roundCurrency(Number(method.balance), currency);
      const required = roundCurrency(Math.abs(normalizedAmount), currency);
      if (available + 0.0001 < required) {
        throw new BadRequestException(
          `Saldo insuficiente en ${method.name}. Disponible: ${available} ${currency}`,
        );
      }
    }

    await tx.paymentMethod.update({
      where: { id: paymentMethodId },
      data: { balance: { increment: normalizedAmount } },
    });

    if (method.bankAccountId) {
      await tx.bankAccount.update({
        where: { id: method.bankAccountId },
        data: { balance: { increment: normalizedAmount } },
      });
    }
  }

  /** @deprecated Use recordMovement — mantiene compatibilidad interna */
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
