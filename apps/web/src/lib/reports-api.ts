import { apiFetch } from './api-client';
import type {
  AnalisisInventarioReport,
  DashboardSummary,
  FlujoCajaReport,
  MetodosPagoReport,
  VentasDiariasReport,
} from '@/types/reports';

export interface ExportRowsResponse {
  from?: string;
  to?: string;
  rows: Array<Record<string, string | number>>;
  totalFacturas?: number;
}

export interface ExportBancosResponse {
  bancos: Array<Record<string, string | number>>;
  cuentas: Array<Record<string, string | number>>;
  metodosPago: Array<Record<string, string | number>>;
}

export const reportsApi = {
  dashboard: () => apiFetch<DashboardSummary>('/reports/dashboard'),

  ventasDiarias: (days: number) =>
    apiFetch<VentasDiariasReport>(`/reports/ventas/diario?days=${days}`),

  metodosPago: (days: number) =>
    apiFetch<MetodosPagoReport>(`/reports/ventas/metodos-pago?days=${days}`),

  analisisInventario: (coverageDays: number) =>
    apiFetch<AnalisisInventarioReport>(
      `/reports/inventario/analisis?coverageDays=${coverageDays}`,
    ),

  flujoCaja: (days: number) =>
    apiFetch<FlujoCajaReport>(`/reports/flujo-caja?days=${days}`),

  exportVentas: (from: string, to: string) =>
    apiFetch<ExportRowsResponse>(`/reports/export/ventas?from=${from}&to=${to}`),

  exportClientes: () =>
    apiFetch<{ rows: Array<Record<string, string | number>> }>('/reports/export/clientes'),

  exportMovimientos: (from: string, to: string) =>
    apiFetch<ExportRowsResponse>(`/reports/export/movimientos?from=${from}&to=${to}`),

  exportPlanificacion: (coverageDays = 45) =>
    apiFetch<{ rows: Array<Record<string, string | number>> }>(
      `/reports/export/planificacion-compra?coverageDays=${coverageDays}`,
    ),

  exportBancos: () => apiFetch<ExportBancosResponse>('/reports/export/bancos'),
};
