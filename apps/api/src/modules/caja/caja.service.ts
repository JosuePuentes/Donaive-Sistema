import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { roundCurrency, BASE_CURRENCY, TRANSACTION_CURRENCY } from '@flp/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AperturaCajaDto, CierreCajaDto } from './dto/caja.dto';

export interface ArqueoLineaEstado {
  paymentMethodId: string;
  paymentMethodCode: string;
  paymentMethodName: string;
  currency: string;
  montoEsperadoUsd: number;
  montoEsperadoVes: number;
}

export interface EstadoCajaActual {
  session: {
    id: string;
    sessionNumber: string;
    status: string;
    openedAt: Date;
    openingBalanceUsd: number;
    openingBalanceVes: number;
  };
  resumenVentas: {
    totalVentasUsd: number;
    totalVentasVes: number;
    cantidadVentas: number;
  };
  arqueoEsperado: ArqueoLineaEstado[];
}

@Injectable()
export class CajaService {
  constructor(private readonly prisma: PrismaService) {}

  async getOpenSessionForUser(userId: string) {
    return this.prisma.cashRegisterSession.findFirst({
      where: { openedById: userId, status: 'OPEN' },
      include: {
        bankAccount: { select: { id: true, accountName: true, accountNumber: true } },
      },
    });
  }

  async apertura(dto: AperturaCajaDto, userId: string) {
    const existing = await this.getOpenSessionForUser(userId);
    if (existing) {
      throw new ConflictException(
        `Ya tiene una caja abierta (${existing.sessionNumber}). Debe cerrarla antes de abrir otra.`,
      );
    }

    const bankAccountId = dto.bankAccountId ?? (await this.getDefaultCashAccountId());

    const sessionNumber = await this.generateSessionNumber();

    const session = await this.prisma.cashRegisterSession.create({
      data: {
        sessionNumber,
        bankAccountId,
        openedById: userId,
        status: 'OPEN',
        openingBalanceUsd: dto.montoAperturaUsd,
        openingBalanceVes: dto.montoAperturaVes,
        notes: dto.notes,
      },
      include: {
        bankAccount: { select: { id: true, accountName: true } },
        openedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return this.mapSessionResponse(session);
  }

  async estadoActual(userId: string): Promise<EstadoCajaActual | { abierta: false }> {
    const session = await this.getOpenSessionForUser(userId);
    if (!session) {
      return { abierta: false };
    }

    const arqueoEsperado = await this.calcularArqueoEsperado(session);
    const resumenVentas = await this.calcularResumenVentas(session.id);

    return {
      session: {
        id: session.id,
        sessionNumber: session.sessionNumber,
        status: session.status,
        openedAt: session.openedAt,
        openingBalanceUsd: Number(session.openingBalanceUsd),
        openingBalanceVes: Number(session.openingBalanceVes),
      },
      resumenVentas,
      arqueoEsperado,
    };
  }

  async cierre(dto: CierreCajaDto, userId: string) {
    const session = await this.getOpenSessionForUser(userId);
    if (!session) {
      throw new NotFoundException('No tiene una sesión de caja abierta');
    }

    const arqueoEsperado = await this.calcularArqueoEsperado(session);
    const resumenVentas = await this.calcularResumenVentas(session.id);
    const paymentMethods = await this.prisma.paymentMethod.findMany({
      where: { isActive: true },
    });
    const methodMap = new Map(paymentMethods.map((m) => [m.id, m]));

    const declaredMap = new Map(
      dto.lineas.map((l) => [l.paymentMethodId, l]),
    );

    let totalDifferenceUsd = 0;
    let totalDifferenceVes = 0;
    let closingBalanceUsd = Number(session.openingBalanceUsd);
    let closingBalanceVes = Number(session.openingBalanceVes);

    const countLinesData: Array<{
      paymentMethodId: string;
      expectedAmountUsd: number;
      expectedAmountVes: number;
      countedAmountUsd: number;
      countedAmountVes: number;
      differenceUsd: number;
      differenceVes: number;
    }> = [];

    for (const esperado of arqueoEsperado) {
      const declarado = declaredMap.get(esperado.paymentMethodId) ?? {
        paymentMethodId: esperado.paymentMethodId,
        montoDeclaradoUsd: 0,
        montoDeclaradoVes: 0,
      };

      const diffUsd = roundCurrency(
        declarado.montoDeclaradoUsd - esperado.montoEsperadoUsd,
        BASE_CURRENCY,
      );
      const diffVes = roundCurrency(
        declarado.montoDeclaradoVes - esperado.montoEsperadoVes,
        TRANSACTION_CURRENCY,
      );

      totalDifferenceUsd = roundCurrency(totalDifferenceUsd + diffUsd, BASE_CURRENCY);
      totalDifferenceVes = roundCurrency(totalDifferenceVes + diffVes, TRANSACTION_CURRENCY);

      const method = methodMap.get(esperado.paymentMethodId);
      if (method?.type === 'CASH_USD') {
        closingBalanceUsd = declarado.montoDeclaradoUsd;
      }
      if (method?.type === 'CASH_VES') {
        closingBalanceVes = declarado.montoDeclaradoVes;
      }

      countLinesData.push({
        paymentMethodId: esperado.paymentMethodId,
        expectedAmountUsd: esperado.montoEsperadoUsd,
        expectedAmountVes: esperado.montoEsperadoVes,
        countedAmountUsd: declarado.montoDeclaradoUsd,
        countedAmountVes: declarado.montoDeclaradoVes,
        differenceUsd: diffUsd,
        differenceVes: diffVes,
      });
    }

    const closedAt = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.cashRegisterCountLine.deleteMany({
        where: { cashRegisterSessionId: session.id },
      });

      await tx.cashRegisterCountLine.createMany({
        data: countLinesData.map((line) => ({
          cashRegisterSessionId: session.id,
          ...line,
        })),
      });

      const updated = await tx.cashRegisterSession.update({
        where: { id: session.id },
        data: {
          status: 'CLOSED',
          closedAt,
          closingBalanceUsd,
          closingBalanceVes,
          totalSalesUsd: resumenVentas.totalVentasUsd,
          totalSalesVes: resumenVentas.totalVentasVes,
          totalDifferenceUsd,
          totalDifferenceVes,
          notes: dto.notes ?? session.notes,
        },
        include: {
          countLines: {
            include: { paymentMethod: true },
          },
          openedBy: { select: { id: true, firstName: true, lastName: true } },
          bankAccount: { select: { id: true, accountName: true } },
        },
      });

      return updated;
    });

    return this.buildReporteZ(result, resumenVentas);
  }

  /** Valida que el usuario tenga caja abierta — usado por ventas POS */
  async requireOpenSession(userId: string) {
    const session = await this.getOpenSessionForUser(userId);
    if (!session) {
      throw new BadRequestException(
        'Debe abrir la caja antes de realizar ventas en el POS',
      );
    }
    return session;
  }

  async getSessionById(sessionId: string) {
    const session = await this.prisma.cashRegisterSession.findUnique({
      where: { id: sessionId },
      include: {
        countLines: { include: { paymentMethod: true } },
        openedBy: { select: { firstName: true, lastName: true } },
      },
    });
    if (!session) throw new NotFoundException('Sesión no encontrada');
    return session;
  }

  // ─── Cálculos internos ────────────────────────────────────────────────────

  private async calcularArqueoEsperado(
    session: { id: string; openingBalanceUsd: Prisma.Decimal; openingBalanceVes: Prisma.Decimal },
  ): Promise<ArqueoLineaEstado[]> {
    const paymentMethods = await this.prisma.paymentMethod.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    const payments = await this.prisma.documentPayment.findMany({
      where: {
        invoice: { cashRegisterSessionId: session.id, status: 'CONFIRMED' },
      },
      include: { paymentMethod: true },
    });

    const totalsByMethod = new Map<string, { usd: number; ves: number }>();

    for (const pm of paymentMethods) {
      totalsByMethod.set(pm.id, { usd: 0, ves: 0 });
    }

    for (const payment of payments) {
      const current = totalsByMethod.get(payment.paymentMethodId) ?? { usd: 0, ves: 0 };
      current.usd = roundCurrency(current.usd + Number(payment.amountUsd), BASE_CURRENCY);
      if (payment.currency === 'VES') {
        current.ves = roundCurrency(current.ves + Number(payment.amount), TRANSACTION_CURRENCY);
      } else {
        current.ves = roundCurrency(current.ves + Number(payment.amountUsd) * Number(payment.tasaBcvMomento), TRANSACTION_CURRENCY);
      }
      totalsByMethod.set(payment.paymentMethodId, current);
    }

    return paymentMethods.map((pm) => {
      const totals = totalsByMethod.get(pm.id) ?? { usd: 0, ves: 0 };
      let expectedUsd = totals.usd;
      let expectedVes = totals.ves;

      if (pm.type === 'CASH_USD') {
        expectedUsd = roundCurrency(expectedUsd + Number(session.openingBalanceUsd), BASE_CURRENCY);
      }
      if (pm.type === 'CASH_VES') {
        expectedVes = roundCurrency(expectedVes + Number(session.openingBalanceVes), TRANSACTION_CURRENCY);
      }

      return {
        paymentMethodId: pm.id,
        paymentMethodCode: pm.code,
        paymentMethodName: pm.name,
        currency: pm.currency,
        montoEsperadoUsd: expectedUsd,
        montoEsperadoVes: expectedVes,
      };
    });
  }

  private async calcularResumenVentas(sessionId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: { cashRegisterSessionId: sessionId, status: 'CONFIRMED' },
      select: { totalUsd: true, totalVes: true },
    });

    return {
      totalVentasUsd: roundCurrency(
        invoices.reduce((s, i) => s + Number(i.totalUsd), 0),
        BASE_CURRENCY,
      ),
      totalVentasVes: roundCurrency(
        invoices.reduce((s, i) => s + Number(i.totalVes), 0),
        TRANSACTION_CURRENCY,
      ),
      cantidadVentas: invoices.length,
    };
  }

  private async getDefaultCashAccountId(): Promise<string> {
    const account = await this.prisma.bankAccount.findFirst({
      where: { accountType: 'CASH_REGISTER', isActive: true },
    });
    if (!account) {
      throw new BadRequestException(
        'No hay cuenta de caja configurada. Configure una cuenta tipo CAJA en Bancos.',
      );
    }
    return account.id;
  }

  private async generateSessionNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const count = await this.prisma.cashRegisterSession.count({
      where: { openedAt: { gte: startOfDay } },
    });
    return `CAJA-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }

  private mapSessionResponse(session: {
    id: string;
    sessionNumber: string;
    status: string;
    openingBalanceUsd: Prisma.Decimal;
    openingBalanceVes: Prisma.Decimal;
    openedAt: Date;
    bankAccount: { id: string; accountName: string };
    openedBy: { firstName: string; lastName: string };
  }) {
    return {
      id: session.id,
      sessionNumber: session.sessionNumber,
      status: session.status,
      montoAperturaUsd: Number(session.openingBalanceUsd),
      montoAperturaVes: Number(session.openingBalanceVes),
      openedAt: session.openedAt,
      bankAccount: session.bankAccount,
      cajero: session.openedBy,
    };
  }

  private buildReporteZ(
    session: {
      id: string;
      sessionNumber: string;
      openedAt: Date;
      closedAt: Date | null;
      openingBalanceUsd: Prisma.Decimal;
      openingBalanceVes: Prisma.Decimal;
      closingBalanceUsd: Prisma.Decimal | null;
      closingBalanceVes: Prisma.Decimal | null;
      totalSalesUsd: Prisma.Decimal | null;
      totalSalesVes: Prisma.Decimal | null;
      totalDifferenceUsd: Prisma.Decimal | null;
      totalDifferenceVes: Prisma.Decimal | null;
      countLines: Array<{
        paymentMethod: { code: string; name: string; currency: string };
        expectedAmountUsd: Prisma.Decimal;
        expectedAmountVes: Prisma.Decimal;
        countedAmountUsd: Prisma.Decimal;
        countedAmountVes: Prisma.Decimal;
        differenceUsd: Prisma.Decimal;
        differenceVes: Prisma.Decimal;
      }>;
      openedBy: { firstName: string; lastName: string };
      bankAccount: { accountName: string };
    },
    resumenVentas: { cantidadVentas: number },
  ) {
    const diffUsd = Number(session.totalDifferenceUsd ?? 0);
    const diffVes = Number(session.totalDifferenceVes ?? 0);

    return {
      tipo: 'REPORTE_Z' as const,
      session: {
        id: session.id,
        sessionNumber: session.sessionNumber,
        cajero: `${session.openedBy.firstName} ${session.openedBy.lastName}`,
        cuenta: session.bankAccount.accountName,
        apertura: session.openedAt,
        cierre: session.closedAt,
        fondoInicialUsd: Number(session.openingBalanceUsd),
        fondoInicialVes: Number(session.openingBalanceVes),
      },
      ventas: {
        cantidad: resumenVentas.cantidadVentas,
        totalUsd: Number(session.totalSalesUsd ?? 0),
        totalVes: Number(session.totalSalesVes ?? 0),
      },
      arqueo: session.countLines.map((line) => ({
        metodoPago: line.paymentMethod.name,
        codigo: line.paymentMethod.code,
        moneda: line.paymentMethod.currency,
        esperadoUsd: Number(line.expectedAmountUsd),
        esperadoVes: Number(line.expectedAmountVes),
        declaradoUsd: Number(line.countedAmountUsd),
        declaradoVes: Number(line.countedAmountVes),
        diferenciaUsd: Number(line.differenceUsd),
        diferenciaVes: Number(line.differenceVes),
        estado:
          Number(line.differenceUsd) === 0 && Number(line.differenceVes) === 0
            ? 'CUADRADO'
            : Number(line.differenceUsd) > 0 || Number(line.differenceVes) > 0
              ? 'SOBRANTE'
              : 'FALTANTE',
      })),
      totales: {
        diferenciaUsd: diffUsd,
        diferenciaVes: diffVes,
        estadoGeneral:
          diffUsd === 0 && diffVes === 0
            ? 'CUADRADO'
            : diffUsd > 0 || diffVes > 0
              ? 'SOBRANTE'
              : 'FALTANTE',
        saldoCierreUsd: Number(session.closingBalanceUsd ?? 0),
        saldoCierreVes: Number(session.closingBalanceVes ?? 0),
      },
    };
  }
}
