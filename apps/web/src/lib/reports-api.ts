import { apiFetch } from './api-client';
import type {
  DashboardSummary,
  VentasDiariasReport,
  MetodosPagoReport,
  AnalisisInventarioReport,
  FlujoCajaReport,
} from '@/types/reports';

export const reportsApi = {
  dashboard: () => apiFetch<DashboardSummary>('/reports/dashboard'),

  ventasDiarias: (days = 30) =>
    apiFetch<VentasDiariasReport>(`/reports/ventas/diario?days=${days}`),

  metodosPago: (days = 30) =>
    apiFetch<MetodosPagoReport>(`/reports/ventas/metodos-pago?days=${days}`),

  analisisInventario: (coverageDays = 45) =>
    apiFetch<AnalisisInventarioReport>(
      `/reports/inventario/analisis?coverageDays=${coverageDays}`,
    ),

  flujoCaja: (days = 90) => apiFetch<FlujoCajaReport>(`/reports/flujo-caja?days=${days}`),
};
