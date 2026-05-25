import { apiFetch } from './api-client';

export interface CajaSession {
  id: string;
  sessionNumber: string;
  status: string;
  montoAperturaUsd: number;
  montoAperturaVes: number;
  openedAt: string;
  bankAccount: { id: string; accountName: string };
  cajero: { firstName: string; lastName: string };
}

export interface ArqueoLinea {
  paymentMethodId: string;
  paymentMethodCode: string;
  paymentMethodName: string;
  currency: string;
  montoEsperadoUsd: number;
  montoEsperadoVes: number;
}

export interface EstadoCaja {
  session: {
    id: string;
    sessionNumber: string;
    status: string;
    openedAt: string;
    openingBalanceUsd: number;
    openingBalanceVes: number;
  };
  resumenVentas: {
    totalCobradoUsd: number;
    totalFacturadoUsd: number;
    totalVentasUsd: number;
    totalVentasVes: number;
    totalBsRecibidos: number;
    cantidadVentas: number;
  };
  arqueoEsperado: ArqueoLinea[];
}

export interface ReporteZ {
  tipo: 'REPORTE_Z';
  session: {
    id: string;
    sessionNumber: string;
    cajero: string;
    cuenta: string;
    apertura: string;
    cierre: string | null;
    fondoInicialUsd: number;
    fondoInicialVes: number;
  };
  ventas: {
    cantidad: number;
    totalUsd: number;
    totalVes: number;
  };
  arqueo: Array<{
    metodoPago: string;
    codigo: string;
    moneda: string;
    esperadoUsd: number;
    esperadoVes: number;
    declaradoUsd: number;
    declaradoVes: number;
    diferenciaUsd: number;
    diferenciaVes: number;
    estado: 'CUADRADO' | 'SOBRANTE' | 'FALTANTE';
  }>;
  totales: {
    diferenciaUsd: number;
    diferenciaVes: number;
    estadoGeneral: 'CUADRADO' | 'SOBRANTE' | 'FALTANTE';
    saldoCierreUsd: number;
    saldoCierreVes: number;
  };
}

export const cajaApi = {
  apertura: (montoAperturaUsd: number, montoAperturaVes: number, notes?: string) =>
    apiFetch<CajaSession>('/pos/caja/apertura', {
      method: 'POST',
      body: JSON.stringify({ montoAperturaUsd, montoAperturaVes, notes }),
    }),

  estadoActual: () =>
    apiFetch<EstadoCaja | { abierta: false }>('/pos/caja/estado-actual'),

  cierre: (lineas: Array<{ paymentMethodId: string; montoDeclaradoUsd: number; montoDeclaradoVes: number }>, notes?: string) =>
    apiFetch<ReporteZ>('/pos/caja/cierre', {
      method: 'POST',
      body: JSON.stringify({ lineas, notes }),
    }),
};
