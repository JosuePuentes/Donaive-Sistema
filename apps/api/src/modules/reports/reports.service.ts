import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  calculateDemandPlanning,
  calculateLineGrossProfit,
  classifyAbc,
  calculateMarginPercent,
  roundCurrency,
  BASE_CURRENCY,
  TRANSACTION_CURRENCY,
  usdToVes,
  VMD_LOOKBACK_DAYS,
} from '@flp/shared';
import { TransactionFreezeService } from '../../common/services/transaction-freeze.service';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactionFreeze: TransactionFreezeService,
  ) {}

  async getDashboardSummary() {
    await this.markOverdueAccounts();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfWeek = new Date(now);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const [monthInvoices, lowStockCount, cxpWeek, bankBalances, tasaBcv] =
      await Promise.all([
        this.prisma.invoice.findMany({
          where: {
            status: 'CONFIRMED',
            documentType: { in: ['INVOICE', 'POS_SALE'] },
            confirmedAt: { gte: startOfMonth },
          },
          select: {
            totalUsd: true,
            totalVes: true,
            details: { select: { totalUsd: true, unitCostUsd: true, quantity: true } },
          },
        }),
        this.countLowStock(),
        this.prisma.accountPayable.aggregate({
          where: {
            status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
            dueDate: { lte: endOfWeek },
            balanceUsd: { gt: 0 },
          },
          _sum: { balanceUsd: true, balanceVes: true },
          _count: true,
        }),
        this.prisma.bankAccount.aggregate({
          where: { isActive: true },
          _sum: { balance: true },
        }),
        this.transactionFreeze.getTasaBcvMomento(),
      ]);

    let ventasMesUsd = 0;
    let ventasMesVes = 0;
    let utilidadMesUsd = 0;

    for (const inv of monthInvoices) {
      ventasMesUsd += Number(inv.totalUsd);
      ventasMesVes += Number(inv.totalVes);
      for (const d of inv.details) {
        utilidadMesUsd += calculateLineGrossProfit(
          Number(d.totalUsd),
          Number(d.unitCostUsd),
          Number(d.quantity),
        );
      }
    }

    ventasMesUsd = roundCurrency(ventasMesUsd, BASE_CURRENCY);
    utilidadMesUsd = roundCurrency(utilidadMesUsd, BASE_CURRENCY);

    return {
      kpis: {
        ventasMesUsd,
        ventasMesVes: roundCurrency(ventasMesVes, TRANSACTION_CURRENCY),
        margenUtilidadPromedio: calculateMarginPercent(ventasMesUsd, utilidadMesUsd),
        utilidadBrutaMesUsd: utilidadMesUsd,
        cxpPorVencerSemanaUsd: Number(cxpWeek._sum.balanceUsd ?? 0),
        cxpPorVencerSemanaVes: Number(cxpWeek._sum.balanceVes ?? 0),
        cxpPorVencerSemanaCount: cxpWeek._count,
        productosBajoMinimo: lowStockCount,
        disponibilidadBancosUsd: Number(bankBalances._sum.balance ?? 0),
        tasaBcvActual: tasaBcv,
      },
    };
  }

  private async markOverdueAccounts(): Promise<void> {
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

  private async countLowStock(): Promise<number> {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      select: { stock: true, minStock: true },
    });
    return products.filter((p) => Number(p.stock) <= Number(p.minStock)).length;
  }

  async getVentasDiarias(days = 30) {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        status: 'CONFIRMED',
        documentType: { in: ['INVOICE', 'POS_SALE'] },
        confirmedAt: { gte: from, lte: to },
      },
      select: {
        confirmedAt: true,
        totalUsd: true,
        details: { select: { totalUsd: true, unitCostUsd: true, quantity: true } },
      },
      orderBy: { confirmedAt: 'asc' },
    });

    const byDay = new Map<
      string,
      { ventasUsd: number; costoUsd: number; utilidadUsd: number; cantidad: number }
    >();

    for (const inv of invoices) {
      if (!inv.confirmedAt) continue;
      const key = inv.confirmedAt.toISOString().slice(0, 10);
      const bucket = byDay.get(key) ?? {
        ventasUsd: 0,
        costoUsd: 0,
        utilidadUsd: 0,
        cantidad: 0,
      };

      bucket.ventasUsd += Number(inv.totalUsd);
      bucket.cantidad += 1;

      for (const d of inv.details) {
        const cost = Number(d.unitCostUsd) * Number(d.quantity);
        bucket.costoUsd += cost;
        bucket.utilidadUsd += calculateLineGrossProfit(
          Number(d.totalUsd),
          Number(d.unitCostUsd),
          Number(d.quantity),
        );
      }

      byDay.set(key, bucket);
    }

    const series = Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, v]) => ({
        fecha,
        ventasUsd: roundCurrency(v.ventasUsd, BASE_CURRENCY),
        costoMercanciaUsd: roundCurrency(v.costoUsd, BASE_CURRENCY),
        utilidadBrutaUsd: roundCurrency(v.utilidadUsd, BASE_CURRENCY),
        transacciones: v.cantidad,
      }));

    const totales = series.reduce(
      (acc, d) => ({
        ventasUsd: acc.ventasUsd + d.ventasUsd,
        utilidadUsd: acc.utilidadUsd + d.utilidadBrutaUsd,
      }),
      { ventasUsd: 0, utilidadUsd: 0 },
    );

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      series,
      totales: {
        ...totales,
        margenPromedio: calculateMarginPercent(totales.ventasUsd, totales.utilidadUsd),
      },
    };
  }

  async getVentasPorMetodoPago(days = 30) {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);

    const payments = await this.prisma.documentPayment.findMany({
      where: {
        invoiceId: { not: null },
        paidAt: { gte: from, lte: to },
        amountUsd: { gt: 0 },
      },
      include: {
        paymentMethod: {
          select: { id: true, name: true, code: true, type: true, currency: true },
        },
      },
    });

    const byMethod = new Map<
      string,
      { name: string; code: string; usd: number; ves: number; count: number }
    >();

    for (const p of payments) {
      const key = p.paymentMethodId;
      const bucket = byMethod.get(key) ?? {
        name: p.paymentMethod.name,
        code: p.paymentMethod.code,
        usd: 0,
        ves: 0,
        count: 0,
      };
      bucket.usd += Number(p.amountUsd);
      if (p.currency === 'VES') {
        bucket.ves += Number(p.amount);
      } else {
        bucket.ves += usdToVes(Number(p.amountUsd), Number(p.tasaBcvMomento));
      }
      bucket.count += 1;
      byMethod.set(key, bucket);
    }

    const items = Array.from(byMethod.values())
      .map((m) => ({
        ...m,
        usd: roundCurrency(m.usd, BASE_CURRENCY),
        ves: roundCurrency(m.ves, TRANSACTION_CURRENCY),
      }))
      .sort((a, b) => b.usd - a.usd);

    const totalUsd = items.reduce((s, i) => s + i.usd, 0);

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      totalUsd: roundCurrency(totalUsd, BASE_CURRENCY),
      items: items.map((i) => ({
        ...i,
        porcentaje: totalUsd > 0 ? roundCurrency((i.usd / totalUsd) * 100, BASE_CURRENCY) : 0,
      })),
    };
  }

  async getAnalisisInventario(coverageTargetDays = 45) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - VMD_LOOKBACK_DAYS);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const [products, movementSalesAgg, invoiceSalesAgg, lastMovements] = await Promise.all([
      this.prisma.product.findMany({
        where: { isActive: true },
        include: { category: { select: { name: true } } },
        orderBy: { name: 'asc' },
      }),
      this.prisma.inventoryMovement.groupBy({
        by: ['productId'],
        where: {
          movementType: 'SALE_OUT',
          createdAt: { gte: thirtyDaysAgo },
        },
        _sum: { quantity: true },
      }),
      this.prisma.invoiceDetail.groupBy({
        by: ['productId'],
        where: {
          invoice: {
            status: 'CONFIRMED',
            documentType: { in: ['INVOICE', 'POS_SALE'] },
            confirmedAt: { gte: thirtyDaysAgo },
          },
        },
        _sum: { quantity: true, totalUsd: true },
      }),
      this.prisma.inventoryMovement.groupBy({
        by: ['productId'],
        where: { movementType: 'SALE_OUT' },
        _max: { createdAt: true },
      }),
    ]);

    const movementQtyMap = new Map(
      movementSalesAgg.map((m) => [m.productId, Number(m._sum.quantity ?? 0)]),
    );
    const invoiceQtyMap = new Map(
      invoiceSalesAgg.map((s) => [s.productId, Number(s._sum.quantity ?? 0)]),
    );
    const revenueMap = new Map(
      invoiceSalesAgg.map((s) => [s.productId, Number(s._sum.totalUsd ?? 0)]),
    );

    /** Evita subcontar si solo existe un canal; evita doble conteo tomando el máximo por fuente */
    const unitsSold30dMap = new Map<string, number>();
    const productIds = new Set([
      ...movementQtyMap.keys(),
      ...invoiceQtyMap.keys(),
      ...products.map((p) => p.id),
    ]);
    for (const productId of productIds) {
      const fromMovement = movementQtyMap.get(productId) ?? 0;
      const fromInvoice = invoiceQtyMap.get(productId) ?? 0;
      unitsSold30dMap.set(productId, Math.max(fromMovement, fromInvoice));
    }

    const lastSaleMap = new Map(lastMovements.map((m) => [m.productId, m._max.createdAt]));

    const ranked = products
      .map((p) => ({ productId: p.id, revenue: revenueMap.get(p.id) ?? 0 }))
      .filter((p) => p.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);

    const totalRevenue = ranked.reduce((s, r) => s + r.revenue, 0);
    let cumulative = 0;
    const abcMap = new Map<string, 'A' | 'B' | 'C'>();
    for (const r of ranked) {
      cumulative += r.revenue;
      const pct = totalRevenue > 0 ? (cumulative / totalRevenue) * 100 : 100;
      abcMap.set(r.productId, classifyAbc(pct));
    }

    type Item = {
      productId: string;
      sku: string;
      barcode: string | null;
      name: string;
      category: string | null;
      stock: number;
      minStock: number;
      maxStock: number;
      unitsSold30d: number;
      vmd: number;
      runwayDays: number | null;
      coverageTargetDays: number;
      suggestedQty: number;
      emergency: boolean;
      stockout: boolean;
      lostSalesRisk: boolean;
      estimatedLostUnits: number;
      priorityScore: number;
      abcClass: 'A' | 'B' | 'C' | '—';
      isDeadStock: boolean;
      lastSaleAt: string | null;
      costUsd: number;
      marginPercent: number;
      estimatedOrderUsd: number;
    };

    const sugeridos: Item[] = [];
    const highRunners: Item[] = [];
    const deadStock: Item[] = [];

    for (const p of products) {
      const stock = Number(p.stock);
      const minStock = Number(p.minStock);
      const maxStock = p.maxStock ? Number(p.maxStock) : minStock * 2;
      const unitsSold30d = unitsSold30dMap.get(p.id) ?? 0;
      const abcClass = abcMap.get(p.id) ?? '—';

      const lastSale = lastSaleMap.get(p.id);
      const daysSinceLastSale = lastSale
        ? Math.floor((now.getTime() - lastSale.getTime()) / (24 * 60 * 60 * 1000))
        : null;

      const planning = calculateDemandPlanning({
        currentStock: stock,
        minStock,
        unitsSold30d,
        coverageTargetDays,
        abcClass,
        daysSinceLastSale,
      });

      const isDeadStock = !lastSale && unitsSold30d === 0;

      const item: Item = {
        productId: p.id,
        sku: p.sku,
        barcode: p.barcode,
        name: p.name,
        category: p.category?.name ?? null,
        stock,
        minStock,
        maxStock,
        unitsSold30d,
        vmd: planning.vmd,
        runwayDays: planning.runwayDays,
        coverageTargetDays,
        suggestedQty: planning.suggestedQty,
        emergency: planning.emergency,
        stockout: planning.stockout,
        lostSalesRisk: planning.lostSalesRisk,
        estimatedLostUnits: planning.estimatedLostUnits,
        priorityScore: planning.priorityScore,
        abcClass,
        isDeadStock,
        lastSaleAt: lastSale?.toISOString() ?? null,
        costUsd: Number(p.costUsd),
        marginPercent: Number(p.marginPercent),
        estimatedOrderUsd: roundCurrency(
          planning.suggestedQty * Number(p.costUsd),
          BASE_CURRENCY,
        ),
      };

      if (unitsSold30d > 0 && abcClass === 'A') highRunners.push(item);
      if (isDeadStock) deadStock.push(item);

      const needsReplenishment =
        planning.suggestedQty > 0 ||
        planning.emergency ||
        (planning.runwayDays != null && planning.runwayDays < coverageTargetDays);

      if (needsReplenishment) sugeridos.push(item);
    }

    sugeridos.sort((a, b) => b.priorityScore - a.priorityScore);

    return {
      parametros: {
        lookbackDays: VMD_LOOKBACK_DAYS,
        coverageTargetDays,
      },
      resumen: {
        totalProductos: products.length,
        sugeridosReposicion: sugeridos.length,
        emergencia: sugeridos.filter((s) => s.emergency).length,
        quiebreStock: sugeridos.filter((s) => s.stockout).length,
        ventaPerdidaEstimada: sugeridos.filter((s) => s.lostSalesRisk).length,
        highRunners: highRunners.length,
        deadStock: deadStock.length,
      },
      sugeridosCompra: sugeridos,
      highRunners: highRunners.slice(0, 10),
      deadStock: deadStock.slice(0, 20),
    };
  }

  async getFlujoCajaProyectado(horizonDays = 90) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const [bankAccounts, receivables, payables, tasaBcv] = await Promise.all([
      this.prisma.bankAccount.findMany({
        where: { isActive: true },
        select: { id: true, accountName: true, currency: true, balance: true },
      }),
      this.prisma.accountReceivable.findMany({
        where: { status: { in: ['PENDING', 'PARTIAL'] }, balanceUsd: { gt: 0 } },
        select: { dueDate: true, balanceUsd: true },
      }),
      this.prisma.accountPayable.findMany({
        where: { status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] }, balanceUsd: { gt: 0 } },
        select: { dueDate: true, balanceUsd: true },
      }),
      this.transactionFreeze.getTasaBcvMomento(),
    ]);

    const disponibilidadUsd = roundCurrency(
      bankAccounts.reduce((s, a) => s + Number(a.balance), 0),
      BASE_CURRENCY,
    );

    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const buckets: Array<{
      semana: string;
      inicio: string;
      ingresosUsd: number;
      egresosUsd: number;
      netoUsd: number;
    }> = [];

    const weeks = Math.ceil(horizonDays / 7);
    for (let w = 0; w < weeks; w++) {
      const weekStart = new Date(now.getTime() + w * weekMs);
      const weekEnd = new Date(weekStart.getTime() + weekMs);

      let ingresosUsd = 0;
      let egresosUsd = 0;

      for (const ar of receivables) {
        const due = new Date(ar.dueDate);
        if (due >= weekStart && due < weekEnd) ingresosUsd += Number(ar.balanceUsd);
      }
      for (const ap of payables) {
        const due = new Date(ap.dueDate);
        if (due >= weekStart && due < weekEnd) egresosUsd += Number(ap.balanceUsd);
      }

      buckets.push({
        semana: `Sem ${w + 1}`,
        inicio: weekStart.toISOString().slice(0, 10),
        ingresosUsd: roundCurrency(ingresosUsd, BASE_CURRENCY),
        egresosUsd: roundCurrency(egresosUsd, BASE_CURRENCY),
        netoUsd: roundCurrency(ingresosUsd - egresosUsd, BASE_CURRENCY),
      });
    }

    let saldoProyectado = disponibilidadUsd;
    const flujoSemanal = buckets.map((b) => {
      saldoProyectado = roundCurrency(saldoProyectado + b.netoUsd, BASE_CURRENCY);
      return { ...b, saldoAcumuladoUsd: saldoProyectado };
    });

    return {
      horizonDays,
      tasaBcvActual: tasaBcv,
      disponibilidadActualUsd: disponibilidadUsd,
      cuentasBancarias: bankAccounts.map((a) => ({
        nombre: a.accountName,
        moneda: a.currency,
        saldo: Number(a.balance),
      })),
      totalesCxC: {
        usd: roundCurrency(
          receivables.reduce((s, r) => s + Number(r.balanceUsd), 0),
          BASE_CURRENCY,
        ),
        count: receivables.length,
      },
      totalesCxP: {
        usd: roundCurrency(
          payables.reduce((s, p) => s + Number(p.balanceUsd), 0),
          BASE_CURRENCY,
        ),
        count: payables.length,
      },
      flujoSemanal,
    };
  }

  parseDateRange(fromStr?: string, toStr?: string) {
    const to = toStr ? new Date(toStr) : new Date();
    const from = fromStr ? new Date(fromStr) : new Date(to);
    if (!fromStr) from.setDate(from.getDate() - 30);
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }

  async exportVentasGeneral(from: Date, to: Date) {
    const payments = await this.prisma.documentPayment.findMany({
      where: {
        invoiceId: { not: null },
        paidAt: { gte: from, lte: to },
        invoice: {
          status: 'CONFIRMED',
          documentType: { in: ['INVOICE', 'POS_SALE'] },
        },
      },
      include: {
        paymentMethod: {
          select: { code: true, name: true, type: true, currency: true },
        },
        invoice: {
          select: {
            id: true,
            number: true,
            confirmedAt: true,
            totalUsd: true,
            totalVes: true,
            customer: {
              select: { businessName: true, firstName: true, lastName: true, phone: true },
            },
            details: {
              include: {
                product: { select: { sku: true, name: true, brand: true } },
              },
            },
          },
        },
      },
      orderBy: { paidAt: 'desc' },
    });

    const resumen = {
      totalBsEfectivo: 0,
      totalBsDebito: 0,
      totalBsPagoMovil: 0,
      totalBsTransferencia: 0,
      totalBs: 0,
      totalUsdEfectivo: 0,
      totalUsdZelle: 0,
      totalUsd: 0,
    };

    const pagos: Array<Record<string, string | number>> = [];
    const productos: Array<Record<string, string | number>> = [];
    const invoiceIdsDone = new Set<string>();

    for (const p of payments) {
      const inv = p.invoice;
      if (!inv) continue;

      const cliente =
        inv.customer?.businessName ||
        [inv.customer?.firstName, inv.customer?.lastName].filter(Boolean).join(' ') ||
        '—';

      const montoOriginal = Number(p.amount);
      const montoUsd = Number(p.amountUsd);
      const montoBs =
        p.currency === 'VES'
          ? montoOriginal
          : roundCurrency(usdToVes(montoUsd, Number(p.tasaBcvMomento)), TRANSACTION_CURRENCY);

      this.acumularPagoEnResumen(p.paymentMethod.type, p.currency, montoBs, montoUsd, resumen);

      pagos.push({
        fecha: p.paidAt.toISOString().slice(0, 10),
        hora: p.paidAt.toISOString().slice(11, 19),
        factura: inv.number,
        cliente,
        metodoPago: p.paymentMethod.name,
        codigoMetodo: p.paymentMethod.code,
        tipoMetodo: p.paymentMethod.type,
        moneda: p.currency,
        monto: roundCurrency(montoOriginal, p.currency === 'VES' ? TRANSACTION_CURRENCY : BASE_CURRENCY),
        montoBs: roundCurrency(montoBs, TRANSACTION_CURRENCY),
        montoUsd: roundCurrency(montoUsd, BASE_CURRENCY),
        referencia: p.reference ?? '',
      });

      if (!invoiceIdsDone.has(inv.id)) {
        invoiceIdsDone.add(inv.id);
        for (const d of inv.details) {
          productos.push({
            fecha: inv.confirmedAt?.toISOString().slice(0, 10) ?? '',
            factura: inv.number,
            cliente,
            codigo: d.product.sku,
            descripcion: d.product.name,
            marca: d.product.brand ?? '',
            cantidad: Number(d.quantity),
            totalLineaUsd: Number(d.totalUsd),
            totalLineaBs: Number(d.totalVes),
          });
        }
      }
    }

    const resumenFilas: Array<Record<string, string | number>> = [
      { concepto: 'Total Bs — Efectivo', montoBs: resumen.totalBsEfectivo, montoUsd: 0 },
      { concepto: 'Total Bs — Débito', montoBs: resumen.totalBsDebito, montoUsd: 0 },
      { concepto: 'Total Bs — Pago móvil', montoBs: resumen.totalBsPagoMovil, montoUsd: 0 },
      { concepto: 'Total Bs — Transferencia', montoBs: resumen.totalBsTransferencia, montoUsd: 0 },
      { concepto: 'TOTAL BOLÍVARES', montoBs: resumen.totalBs, montoUsd: 0 },
      { concepto: 'Total USD — Efectivo', montoBs: 0, montoUsd: resumen.totalUsdEfectivo },
      { concepto: 'Total USD — Zelle', montoBs: 0, montoUsd: resumen.totalUsdZelle },
      { concepto: 'TOTAL DÓLARES', montoBs: 0, montoUsd: resumen.totalUsd },
    ];

    Object.keys(resumen).forEach((k) => {
      const key = k as keyof typeof resumen;
      resumen[key] = roundCurrency(
        resumen[key],
        k.startsWith('totalBs') || k === 'totalBs' ? TRANSACTION_CURRENCY : BASE_CURRENCY,
      );
    });

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      totalFacturas: invoiceIdsDone.size,
      totalPagos: payments.length,
      resumen,
      pagos,
      productos,
      resumenFilas,
      rows: pagos,
    };
  }

  private acumularPagoEnResumen(
    type: string,
    currency: string,
    montoBs: number,
    montoUsd: number,
    resumen: {
      totalBsEfectivo: number;
      totalBsDebito: number;
      totalBsPagoMovil: number;
      totalBsTransferencia: number;
      totalBs: number;
      totalUsdEfectivo: number;
      totalUsdZelle: number;
      totalUsd: number;
    },
  ) {
    switch (type) {
      case 'CASH_VES':
        resumen.totalBsEfectivo += montoBs;
        resumen.totalBs += montoBs;
        break;
      case 'DEBIT_CARD':
        resumen.totalBsDebito += montoBs;
        resumen.totalBs += montoBs;
        break;
      case 'MOBILE_PAYMENT':
        resumen.totalBsPagoMovil += montoBs;
        resumen.totalBs += montoBs;
        break;
      case 'BANK_TRANSFER':
        if (currency === 'VES') {
          resumen.totalBsTransferencia += montoBs;
          resumen.totalBs += montoBs;
        } else {
          resumen.totalUsd += montoUsd;
        }
        break;
      case 'CASH_USD':
        resumen.totalUsdEfectivo += montoUsd;
        resumen.totalUsd += montoUsd;
        break;
      case 'ZELLE':
        resumen.totalUsdZelle += montoUsd;
        resumen.totalUsd += montoUsd;
        break;
      default:
        if (currency === 'VES') {
          resumen.totalBs += montoBs;
        } else {
          resumen.totalUsd += montoUsd;
        }
    }
  }

  async exportClientes() {
    const customers = await this.prisma.customer.findMany({
      where: { isActive: true },
      orderBy: { businessName: 'asc' },
    });

    return {
      rows: customers.map((c) => ({
        rif: c.rif ?? '',
        nombre:
          c.businessName ||
          [c.firstName, c.lastName].filter(Boolean).join(' ') ||
          '',
        telefono: c.phone,
        email: c.email ?? '',
        limiteCreditoUsd: Number(c.creditLimitUsd),
      })),
    };
  }

  async exportMovimientosUnidades(from: Date, to: Date) {
    const movements = await this.prisma.inventoryMovement.findMany({
      where: { createdAt: { gte: from, lte: to } },
      include: {
        product: { select: { sku: true, name: true, brand: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      rows: movements.map((m) => ({
        fecha: m.createdAt.toISOString().slice(0, 10),
        hora: m.createdAt.toISOString().slice(11, 19),
        codigo: m.product.sku,
        producto: m.product.name,
        marca: m.product.brand ?? '',
        tipo: m.movementType,
        cantidad: Number(m.quantity),
        stockAntes: Number(m.stockBefore),
        stockDespues: Number(m.stockAfter),
        costoUsd: Number(m.unitCostUsd),
        referencia: m.referenceNumber ?? '',
        usuario: `${m.createdBy.firstName} ${m.createdBy.lastName}`,
      })),
    };
  }

  async exportPlanificacionCompra(coverageDays = 45) {
    const data = await this.getAnalisisInventario(coverageDays);
    return {
      coverageDays,
      rows: data.sugeridosCompra.map((p) => ({
        codigo: p.sku,
        producto: p.name,
        categoria: p.category ?? '',
        stock: p.stock,
        vmd: p.vmd,
        diasCobertura: p.runwayDays ?? '',
        cantidadSugerida: p.suggestedQty,
        claseAbc: p.abcClass,
        costoUsd: p.costUsd,
        prioridad: p.priorityScore,
      })),
    };
  }

  async exportBancos() {
    const [banks, methods, accounts] = await Promise.all([
      this.prisma.bank.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      this.prisma.paymentMethod.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.bankAccount.findMany({
        where: { isActive: true },
        include: { bank: { select: { code: true, name: true } } },
      }),
    ]);

    return {
      bancos: banks.map((b) => ({ codigo: b.code, nombre: b.name })),
      cuentas: accounts.map((a) => ({
        banco: a.bank.code,
        cuenta: a.accountNumber,
        nombre: a.accountName,
        moneda: a.currency,
        saldo: Number(a.balance),
      })),
      metodosPago: methods.map((m) => ({
        codigo: m.code,
        nombre: m.name,
        tipo: m.type,
        moneda: m.currency,
      })),
    };
  }
}
