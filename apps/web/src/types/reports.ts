export interface DashboardKpis {
  ventasDiaUsd: number;
  ventasDiaTransacciones: number;
  ventasMesUsd: number;
  ventasMesVes: number;
  margenUtilidadPromedio: number;
  utilidadBrutaMesUsd: number;
  cxpPorVencerSemanaUsd: number;
  cxpPorVencerSemanaVes: number;
  cxpPorVencerSemanaCount: number;
  productosBajoMinimo: number;
  disponibilidadBancosUsd: number;
  tasaBcvActual: number;
}

export interface DashboardSummary {
  kpis: DashboardKpis;
}

export interface VentasDiariasPoint {
  fecha: string;
  ventasUsd: number;
  costoMercanciaUsd: number;
  utilidadBrutaUsd: number;
  transacciones: number;
}

export interface VentasDiariasReport {
  from: string;
  to: string;
  series: VentasDiariasPoint[];
  totales: {
    ventasUsd: number;
    utilidadUsd: number;
    margenPromedio: number;
  };
}

export interface MetodoPagoItem {
  name: string;
  code: string;
  usd: number;
  ves: number;
  count: number;
  porcentaje: number;
}

export interface MetodosPagoReport {
  from: string;
  to: string;
  totalUsd: number;
  items: MetodoPagoItem[];
}

export interface SugeridoCompraItem {
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
}

export interface AnalisisInventarioReport {
  parametros: {
    lookbackDays: number;
    coverageTargetDays: number;
  };
  resumen: {
    totalProductos: number;
    sugeridosReposicion: number;
    emergencia: number;
    quiebreStock: number;
    ventaPerdidaEstimada: number;
    highRunners: number;
    deadStock: number;
  };
  sugeridosCompra: SugeridoCompraItem[];
  highRunners: SugeridoCompraItem[];
  deadStock: SugeridoCompraItem[];
}

export interface FlujoSemanalItem {
  semana: string;
  inicio: string;
  ingresosUsd: number;
  egresosUsd: number;
  netoUsd: number;
  saldoAcumuladoUsd: number;
}

export interface FlujoCajaReport {
  horizonDays: number;
  tasaBcvActual: number;
  disponibilidadActualUsd: number;
  cuentasBancarias: Array<{ nombre: string; moneda: string; saldo: number }>;
  totalesCxC: { usd: number; count: number };
  totalesCxP: { usd: number; count: number };
  flujoSemanal: FlujoSemanalItem[];
}
