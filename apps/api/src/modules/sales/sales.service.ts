import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DocumentType, type Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePosSaleDto } from './dto/pos-sale.dto';
import { TransactionFreezeService } from '../../common/services/transaction-freeze.service';
import { TreasuryService } from '../../common/services/treasury.service';
import { InventoryService } from '../inventory/inventory.service';
import { CajaService } from '../caja/caja.service';
import {
  calculateGrossProfit,
  convertPaymentToUsd,
  validatePosPayments,
  vesToUsd,
  roundCurrency,
  BASE_CURRENCY,
  TRANSACTION_CURRENCY,
  type CurrencyCode,
} from '@flp/shared';

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactionFreeze: TransactionFreezeService,
    private readonly inventoryService: InventoryService,
    private readonly cajaService: CajaService,
    private readonly treasuryService: TreasuryService,
  ) {}

  async getVentasResumen() {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const invoiceFilter: Prisma.InvoiceWhereInput = {
      status: 'CONFIRMED',
      documentType: { in: [DocumentType.INVOICE, DocumentType.POS_SALE] },
    };

    const [diaPagos, mesPagos, mesFacturas] = await Promise.all([
      this.prisma.documentPayment.aggregate({
        where: { invoice: { ...invoiceFilter, confirmedAt: { gte: startOfDay } } },
        _sum: { amountUsd: true },
        _count: true,
      }),
      this.prisma.documentPayment.aggregate({
        where: { invoice: { ...invoiceFilter, confirmedAt: { gte: startOfMonth } } },
        _sum: { amountUsd: true },
        _count: true,
      }),
      this.prisma.invoice.aggregate({
        where: { ...invoiceFilter, confirmedAt: { gte: startOfMonth } },
        _sum: { totalUsd: true, totalVes: true },
        _count: true,
      }),
    ]);

    return {
      ventasDiaUsd: roundCurrency(Number(diaPagos._sum?.amountUsd ?? 0), BASE_CURRENCY),
      ventasDiaTransacciones: diaPagos._count,
      ventasMesCobradoUsd: roundCurrency(Number(mesPagos._sum?.amountUsd ?? 0), BASE_CURRENCY),
      ventasMesFacturadoUsd: roundCurrency(Number(mesFacturas._sum?.totalUsd ?? 0), BASE_CURRENCY),
      ventasMesVes: roundCurrency(Number(mesFacturas._sum?.totalVes ?? 0), TRANSACTION_CURRENCY),
      ventasMesTransacciones: mesFacturas._count,
      tasaBcvActual: await this.transactionFreeze.getTasaBcvMomento(),
    };
  }

  findRecentSales() {
    return this.prisma.invoice.findMany({
      where: {
        documentType: { in: [DocumentType.INVOICE, DocumentType.POS_SALE] },
        status: 'CONFIRMED',
      },
      select: {
        id: true,
        number: true,
        documentType: true,
        status: true,
        totalUsd: true,
        totalVes: true,
        confirmedAt: true,
        createdAt: true,
        customer: { select: { id: true, firstName: true, lastName: true, businessName: true } },
        cashRegisterSession: { select: { sessionNumber: true } },
        tasaBcvMomento: true,
        payments: {
          select: {
            id: true,
            amount: true,
            amountUsd: true,
            currency: true,
            reference: true,
            paymentMethod: { select: { code: true, name: true } },
          },
        },
        details: {
          take: 8,
          select: {
            id: true,
            quantity: true,
            totalUsd: true,
            product: { select: { name: true, barcode: true, brand: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async createPosSale(dto: CreatePosSaleDto, userId: string) {
    const cajaSession = await this.cajaService.requireOpenSession(userId);

    const payments = dto.payments.filter((p) => p.amount > 0);
    if (payments.length === 0) {
      throw new BadRequestException('Debe registrar al menos un pago');
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: dto.lines.map((l) => l.productId) }, isActive: true },
    });

    if (products.length !== dto.lines.length) {
      throw new NotFoundException('Uno o más productos no encontrados');
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    const tasaBcvMomento = await this.transactionFreeze.getTasaBcvMomento();

    const lineInputs = dto.lines.map((line) => {
      const product = productMap.get(line.productId)!;
      return {
        unitPriceUsd: Number(product.salePriceUsd),
        quantity: line.quantity,
        discountUsd: line.discountUsd,
      };
    });

    const { lines: frozenLines, totals } =
      await this.transactionFreeze.freezeDocumentWithCurrentRate(lineInputs);

    const methodIds = [
      ...payments.map((p) => p.paymentMethodId),
      ...(dto.change ? [dto.change.paymentMethodId] : []),
    ];

    const paymentMethods = await this.prisma.paymentMethod.findMany({
      where: { id: { in: methodIds } },
    });
    const methodMap = new Map(paymentMethods.map((m) => [m.id, m]));

    for (const payment of payments) {
      const method = methodMap.get(payment.paymentMethodId);
      if (!method || !method.isActive) {
        throw new BadRequestException(`Método de pago no válido: ${payment.paymentMethodId}`);
      }
      if (method.currency !== payment.currency) {
        throw new BadRequestException(
          `La moneda del pago (${payment.currency}) no coincide con ${method.name} (${method.currency})`,
        );
      }
    }

    if (dto.change) {
      const changeMethod = methodMap.get(dto.change.paymentMethodId);
      if (!changeMethod || !changeMethod.isActive) {
        throw new BadRequestException('Método de vuelto no válido');
      }
      if (changeMethod.type !== 'CASH_USD' && changeMethod.type !== 'CASH_VES') {
        throw new BadRequestException('El vuelto solo puede entregarse en efectivo USD o Bs');
      }
      if (changeMethod.currency !== dto.change.currency) {
        throw new BadRequestException('La moneda del vuelto no coincide con el método seleccionado');
      }
    }

    const validation = validatePosPayments(
      totals.totalUsd,
      payments,
      tasaBcvMomento,
      dto.change ?? null,
    );
    if (!validation.valid) {
      throw new BadRequestException(validation.message);
    }

    return this.prisma.$transaction(async (tx) => {
      const number = await this.generateInvoiceNumberInTx(tx, 'POS');

      const invoice = await tx.invoice.create({
        data: {
          number,
          documentType: 'POS_SALE',
          status: 'CONFIRMED',
          customerId: dto.customerId,
          cashRegisterSessionId: cajaSession.id,
          tasaBcvMomento,
          subtotalUsd: totals.subtotalUsd,
          totalUsd: totals.totalUsd,
          subtotalVes: totals.subtotalVes,
          totalVes: totals.totalVes,
          notes: dto.notes,
          createdById: userId,
          confirmedAt: new Date(),
          details: {
            create: dto.lines.map((line, i) => {
              const product = productMap.get(line.productId)!;
              const frozen = frozenLines[i];
              return {
                productId: line.productId,
                quantity: line.quantity,
                unitPriceUsd: frozen.unitPriceUsd,
                unitPriceVes: frozen.unitPriceVes,
                unitCostUsd: Number(product.costUsd),
                discountUsd: frozen.discountUsd,
                totalUsd: frozen.totalUsd,
                totalVes: frozen.totalVes,
              };
            }),
          },
        },
        include: { details: true },
      });

      for (const line of dto.lines) {
        await this.inventoryService.registerMovementInTx(tx, {
          productId: line.productId,
          movementType: 'SALE_OUT',
          quantity: line.quantity,
          userId,
          referenceType: 'POS_SALE',
          referenceId: invoice.id,
          referenceNumber: number,
          tasaBcvMomento,
        });
      }

      for (const payment of payments) {
        const method = methodMap.get(payment.paymentMethodId)!;
        const amountUsd =
          payment.currency === BASE_CURRENCY
            ? roundCurrency(payment.amount, BASE_CURRENCY)
            : vesToUsd(payment.amount, tasaBcvMomento);

        await tx.documentPayment.create({
          data: {
            paymentMethodId: payment.paymentMethodId,
            bankAccountId: method.bankAccountId,
            invoiceId: invoice.id,
            amount: payment.amount,
            currency: payment.currency,
            tasaBcvMomento,
            amountUsd,
            reference: 'PAGO',
          },
        });

        await this.treasuryService.recordMovement(tx, payment.paymentMethodId, payment.amount);
      }

      if (dto.change && dto.change.amount > 0) {
        const changeMethod = methodMap.get(dto.change.paymentMethodId)!;
        const changeAmountUsd = convertPaymentToUsd(
          dto.change.amount,
          dto.change.currency as CurrencyCode,
          tasaBcvMomento,
        );

        await tx.documentPayment.create({
          data: {
            paymentMethodId: dto.change.paymentMethodId,
            bankAccountId: changeMethod.bankAccountId,
            invoiceId: invoice.id,
            amount: -dto.change.amount,
            currency: dto.change.currency,
            tasaBcvMomento,
            amountUsd: -changeAmountUsd,
            reference: 'VUELTO',
          },
        });

        await this.treasuryService.recordMovement(
          tx,
          dto.change.paymentMethodId,
          -dto.change.amount,
        );
      }

      const fullInvoice = await tx.invoice.findUniqueOrThrow({
        where: { id: invoice.id },
        include: {
          details: {
            include: { product: { select: { sku: true, name: true } } },
          },
          payments: {
            include: { paymentMethod: { select: { name: true, code: true } } },
          },
          cashRegisterSession: { select: { sessionNumber: true } },
          createdBy: { select: { firstName: true, lastName: true } },
        },
      });

      const cashierName = fullInvoice.createdBy
        ? `${fullInvoice.createdBy.firstName} ${fullInvoice.createdBy.lastName}`.trim()
        : null;

      return {
        id: fullInvoice.id,
        number: fullInvoice.number,
        totalUsd: Number(fullInvoice.totalUsd),
        totalVes: Number(fullInvoice.totalVes),
        subtotalUsd: Number(fullInvoice.subtotalUsd),
        tasaBcvMomento,
        cashRegisterSessionId: cajaSession.id,
        sessionNumber: fullInvoice.cashRegisterSession?.sessionNumber ?? cajaSession.sessionNumber,
        confirmedAt: fullInvoice.confirmedAt?.toISOString() ?? new Date().toISOString(),
        grossProfitUsd: dto.lines.reduce((sum, line, i) => {
          const product = productMap.get(line.productId)!;
          return (
            sum +
            calculateGrossProfit(
              frozenLines[i].unitPriceUsd,
              Number(product.costUsd),
              line.quantity,
            )
          );
        }, 0),
        paymentsCount: payments.length,
        change: dto.change ?? null,
        cashierName,
        lines: fullInvoice.details.map((d) => ({
          sku: d.product.sku,
          name: d.product.name,
          quantity: Number(d.quantity),
          unitPriceUsd: Number(d.unitPriceUsd),
          unitPriceVes: Number(d.unitPriceVes),
          totalUsd: Number(d.totalUsd),
          totalVes: Number(d.totalVes),
        })),
        payments: fullInvoice.payments
          .filter((p) => p.reference !== 'VUELTO')
          .map((p) => ({
            name: p.paymentMethod.name,
            amount: Number(p.amount),
            currency: p.currency as CurrencyCode,
          })),
      };
    });
  }

  private async generateInvoiceNumberInTx(
    tx: Prisma.TransactionClient,
    prefix: string,
  ): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const count = await tx.invoice.count({
      where: { createdAt: { gte: startOfDay } },
    });
    return `${prefix}-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }
}
