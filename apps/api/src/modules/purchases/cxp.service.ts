import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TransactionFreezeService } from '../../common/services/transaction-freeze.service';
import { TreasuryService } from '../../common/services/treasury.service';
import { CxpAbonoDto } from './dto/cxp.dto';
import {
  computeCxpAbonoApplied,
  computeCxpBalancesAfterAbono,
  type CurrencyCode,
} from '@flp/shared';

@Injectable()
export class CxpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactionFreeze: TransactionFreezeService,
    private readonly treasuryService: TreasuryService,
  ) {}

  async markOverdueAccounts(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await this.prisma.accountPayable.updateMany({
      where: {
        status: { in: ['PENDING', 'PARTIAL'] },
        dueDate: { lt: today },
        balanceUsd: { gt: 0 },
      },
      data: { status: 'OVERDUE' },
    });
  }

  private resolvePayableStatus(
    balanceStatus: 'PENDING' | 'PARTIAL' | 'PAID',
    dueDate: Date,
  ): 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' {
    if (balanceStatus === 'PAID') return 'PAID';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    if (due < today) return 'OVERDUE';
    return balanceStatus;
  }

  async findPendientes(supplierId?: string) {
    await this.markOverdueAccounts();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const accounts = await this.prisma.accountPayable.findMany({
      where: {
        status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
        ...(supplierId ? { supplierId } : {}),
      },
      include: {
        supplier: { select: { id: true, businessName: true, rif: true } },
        purchase: {
          select: {
            id: true,
            number: true,
            purchaseDate: true,
            supplierInvoiceNumber: true,
            supplierControlNumber: true,
            totalUsd: true,
            totalVes: true,
          },
        },
        supplierPayments: {
          orderBy: { paidAt: 'desc' },
          take: 5,
          select: {
            id: true,
            amountAppliedUsd: true,
            amountAppliedVes: true,
            currency: true,
            amountPaid: true,
            tasaBcvAbono: true,
            paidAt: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    const items = accounts.map((ap) => {
      const dueDate = new Date(ap.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const diasRetraso =
        ap.status !== 'PAID' && dueDate < today
          ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0;

      return {
        id: ap.id,
        status: ap.status,
        vencida: diasRetraso > 0,
        diasRetraso,
        tasaBcvMomento: Number(ap.tasaBcvMomento),
        totalUsd: Number(ap.originalUsd),
        totalVes: Number(ap.originalVes),
        saldoPendienteUsd: Number(ap.balanceUsd),
        saldoPendienteVes: Number(ap.balanceVes),
        dueDate: ap.dueDate,
        supplier: ap.supplier,
        purchase: ap.purchase,
        pagosRecientes: ap.supplierPayments.map((p) => ({
          id: p.id,
          montoAbonadoUsd: Number(p.amountAppliedUsd),
          montoAbonadoVes: Number(p.amountAppliedVes),
          montoPagado: Number(p.amountPaid),
          moneda: p.currency,
          tasaBcvAbono: Number(p.tasaBcvAbono),
          fecha: p.paidAt,
        })),
      };
    });

    const resumen = {
      totalPorPagarUsd: items.reduce((s, i) => s + i.saldoPendienteUsd, 0),
      totalPorPagarVes: items.reduce((s, i) => s + i.saldoPendienteVes, 0),
      cantidadDeudas: items.length,
      cantidadVencidas: items.filter((i) => i.vencida).length,
    };

    return { resumen, items };
  }

  async registrarAbono(dto: CxpAbonoDto, userId: string) {
    await this.markOverdueAccounts();

    const tasaBcvAbono = await this.transactionFreeze.getTasaBcvMomento();

    const bankAccount = await this.prisma.bankAccount.findUnique({
      where: { id: dto.bankAccountId },
    });
    if (!bankAccount || !bankAccount.isActive) {
      throw new BadRequestException('Cuenta bancaria no válida o inactiva');
    }

    let paymentMethod = dto.paymentMethodId
      ? await this.prisma.paymentMethod.findUnique({ where: { id: dto.paymentMethodId } })
      : await this.prisma.paymentMethod.findFirst({
          where: {
            isActive: true,
            OR: [{ bankAccountId: dto.bankAccountId }, { type: 'BANK_TRANSFER' }],
          },
          orderBy: { sortOrder: 'asc' },
        });

    if (!paymentMethod) {
      throw new BadRequestException('No hay método de pago configurado para el egreso');
    }

    const accountIds = dto.lineas.map((l) => l.accountPayableId);
    const accounts = await this.prisma.accountPayable.findMany({
      where: { id: { in: accountIds } },
      include: { purchase: { select: { id: true, number: true, status: true } } },
    });

    if (accounts.length !== dto.lineas.length) {
      throw new NotFoundException('Una o más cuentas por pagar no encontradas');
    }

    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    for (const line of dto.lineas) {
      const ap = accountMap.get(line.accountPayableId)!;
      if (!['PENDING', 'PARTIAL', 'OVERDUE'].includes(ap.status)) {
        throw new BadRequestException(
          `La deuda ${ap.purchase.number} no está pendiente de pago (estado: ${ap.status})`,
        );
      }
      if (line.currency !== bankAccount.currency) {
        throw new BadRequestException(
          `La moneda del abono (${line.currency}) debe coincidir con la cuenta (${bankAccount.currency})`,
        );
      }
    }

    const paidAt = new Date();

    return this.prisma.$transaction(async (tx) => {
      const results: Array<{
        accountPayableId: string;
        purchaseNumber: string;
        abono: ReturnType<typeof computeCxpAbonoApplied>;
        nuevoSaldoUsd: number;
        nuevoSaldoVes: number;
        status: string;
      }> = [];

      let totalEgresoCuenta = 0;

      for (const line of dto.lineas) {
        const ap = accountMap.get(line.accountPayableId)!;

        let applied: ReturnType<typeof computeCxpAbonoApplied>;
        try {
          applied = computeCxpAbonoApplied(
            { amount: line.amount, currency: line.currency as CurrencyCode },
            tasaBcvAbono,
          );
        } catch (err) {
          throw new BadRequestException(err instanceof Error ? err.message : 'Abono inválido');
        }

        let balanceResult: ReturnType<typeof computeCxpBalancesAfterAbono>;
        try {
          balanceResult = computeCxpBalancesAfterAbono(
            Number(ap.balanceUsd),
            Number(ap.balanceVes),
            Number(ap.originalUsd),
            applied,
            Number(ap.tasaBcvMomento),
          );
        } catch (err) {
          throw new BadRequestException(err instanceof Error ? err.message : 'Abono inválido');
        }

        const status = this.resolvePayableStatus(balanceResult.status, ap.dueDate);
        const { balanceUsd, balanceVes } = balanceResult;

        await tx.accountPayable.update({
          where: { id: ap.id },
          data: { balanceUsd, balanceVes, status },
        });

        await tx.supplierPayment.create({
          data: {
            accountPayableId: ap.id,
            bankAccountId: dto.bankAccountId,
            paymentMethodId: paymentMethod!.id,
            amountPaid: applied.amountPaid,
            currency: applied.currency,
            amountAppliedUsd: applied.amountAppliedUsd,
            amountAppliedVes: applied.amountAppliedVes,
            tasaBcvAbono,
            paidAt,
            createdById: userId,
            reference: `ABONO-CXP-${ap.purchase.number}`,
            notes: dto.notes,
          },
        });

        await tx.documentPayment.create({
          data: {
            paymentMethodId: paymentMethod!.id,
            bankAccountId: dto.bankAccountId,
            purchaseId: ap.purchaseId,
            amount: applied.amountPaid,
            currency: applied.currency,
            tasaBcvMomento: tasaBcvAbono,
            amountUsd: applied.amountAppliedUsd,
            reference: `ABONO-CXP-${ap.purchase.number}`,
            paidAt,
          },
        });

        const purchaseStatus = status === 'PAID' ? 'PAID' : 'PARTIALLY_PAID';
        await tx.purchase.update({
          where: { id: ap.purchaseId },
          data: { status: purchaseStatus },
        });

        ap.balanceUsd = balanceUsd as unknown as typeof ap.balanceUsd;
        ap.balanceVes = balanceVes as unknown as typeof ap.balanceVes;
        ap.status = status;

        totalEgresoCuenta += applied.amountPaid;
        results.push({
          accountPayableId: ap.id,
          purchaseNumber: ap.purchase.number,
          abono: applied,
          nuevoSaldoUsd: balanceUsd,
          nuevoSaldoVes: balanceVes,
          status,
        });
      }

      await this.treasuryService.applyMovement(tx, dto.bankAccountId, -totalEgresoCuenta);

      return {
        tasaBcvAbono,
        bankAccountId: dto.bankAccountId,
        totalEgreso: totalEgresoCuenta,
        monedaEgreso: bankAccount.currency,
        abonos: results,
      };
    });
  }
}
