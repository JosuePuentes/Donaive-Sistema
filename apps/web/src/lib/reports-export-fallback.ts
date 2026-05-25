import { apiFetch } from './api-client';
import { customerDisplayName } from './customer-display';
import { inventoryApi } from './inventory-api';
import { reportsApi } from './reports-api';
import type { ExportBancosResponse, ExportRowsResponse } from './reports-api';

async function tryExport<T>(paths: string[]): Promise<T> {
  let lastErr: Error | null = null;
  for (const path of paths) {
    try {
      return await apiFetch<T>(path);
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      if (!lastErr.message.includes('404') && !lastErr.message.includes('Cannot GET')) {
        throw lastErr;
      }
    }
  }
  throw lastErr ?? new Error('Ruta de informe no disponible en el servidor');
}

export async function fetchVentasExport(from: string, to: string): Promise<ExportRowsResponse> {
  const qs = `from=${from}&to=${to}`;
  try {
    return await tryExport<ExportRowsResponse>([
      `/reports/ventas-export?${qs}`,
      `/reports/export/ventas?${qs}`,
    ]);
  } catch {
    const days = Math.max(
      1,
      Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / 86400000),
    );
    const daily = await reportsApi.ventasDiarias(days);
    return {
      from: daily.from,
      to: daily.to,
      rows: daily.series.map((d) => ({
        fecha: d.fecha,
        factura: '—',
        cliente: '—',
        codigo: '—',
        descripcion: 'Resumen diario (API sin detalle — redepliegue pendiente)',
        marca: '',
        cantidad: d.transacciones,
        totalUsd: d.ventasUsd,
        totalVes: 0,
      })),
    };
  }
}

export async function fetchClientesExport() {
  try {
    return await tryExport<{ rows: Array<Record<string, string | number>> }>([
      '/reports/clientes-export',
      '/reports/export/clientes',
    ]);
  } catch {
    const rows = await apiFetch<Array<{
      rif: string | null;
      businessName: string | null;
      firstName: string | null;
      lastName: string | null;
      phone: string;
      email: string | null;
      creditLimitUsd: number;
    }>>('/customers');
    return {
      rows: rows.map(
        (c): Record<string, string | number> => ({
          rif: c.rif ?? '',
          nombre: c.firstName ?? '',
          apellido: c.lastName ?? '',
          nombreCompleto: customerDisplayName(c),
          telefono: c.phone,
          email: c.email ?? '',
          limiteCreditoUsd: c.creditLimitUsd,
        }),
      ),
    };
  }
}

export async function fetchMovimientosExport(from: string, to: string): Promise<ExportRowsResponse> {
  const qs = `from=${from}&to=${to}`;
  try {
    return await tryExport<ExportRowsResponse>([
      `/reports/movimientos-export?${qs}`,
      `/reports/export/movimientos?${qs}`,
    ]);
  } catch {
    const all: Array<Record<string, string | number>> = [];
    let page = 1;
    let totalPages = 1;
    do {
      const res = await inventoryApi.movements({
        dateFrom: from,
        dateTo: to,
        page,
        limit: 200,
      });
      for (const m of res.data) {
        all.push({
          fecha: m.createdAt.slice(0, 10),
          hora: m.createdAt.slice(11, 19),
          codigo: m.product.sku,
          producto: m.product.name,
          tipo: m.movementType,
          cantidad: m.quantity,
          stockAntes: m.stockBefore,
          stockDespues: m.stockAfter,
          costoUsd: m.unitCostUsd,
          referencia: m.referenceNumber ?? '',
        });
      }
      totalPages = res.meta.totalPages;
      page += 1;
    } while (page <= totalPages);
    return { from, to, rows: all };
  }
}

export async function fetchPlanificacionExport(coverageDays: number) {
  try {
    return await tryExport<{ rows: Array<Record<string, string | number>> }>([
      `/reports/planificacion-compra-export?coverageDays=${coverageDays}`,
      `/reports/export/planificacion-compra?coverageDays=${coverageDays}`,
    ]);
  } catch {
    const data = await reportsApi.analisisInventario(coverageDays);
    return {
      rows: data.sugeridosCompra.map(
        (p): Record<string, string | number> => ({
          codigo: p.sku,
          producto: p.name,
          categoria: p.category ?? '',
          stock: p.stock,
          vmd: p.vmd,
          cantidadSugerida: p.suggestedQty,
          claseAbc: p.abcClass,
          costoUsd: p.costUsd,
        }),
      ),
    };
  }
}

export async function fetchBancosExport(): Promise<ExportBancosResponse> {
  try {
    return await tryExport<ExportBancosResponse>([
      '/reports/bancos-export',
      '/reports/export/bancos',
    ]);
  } catch {
    const [banks, accounts, methods] = await Promise.all([
      apiFetch<Array<{ code: string; name: string }>>('/banks'),
      apiFetch<Array<{ accountNumber: string; accountName: string; currency: string; balance: number; bank: { code: string } }>>('/bank-accounts'),
      apiFetch<Array<{ code: string; name: string; type: string; currency: string; balance: number }>>('/payment-methods'),
    ]);
    return {
      bancos: banks.map((b) => ({ codigo: b.code, nombre: b.name })),
      cuentas: accounts.map((a) => ({
        banco: a.bank.code,
        cuenta: a.accountNumber,
        nombre: a.accountName,
        moneda: a.currency,
        saldo: a.balance,
      })),
      metodosPago: methods.map((m) => ({
        codigo: m.code,
        nombre: m.name,
        tipo: m.type,
        moneda: m.currency,
        saldoDisponible: Number(m.balance),
      })),
    };
  }
}
