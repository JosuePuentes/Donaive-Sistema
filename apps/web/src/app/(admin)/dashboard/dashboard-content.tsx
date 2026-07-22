'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  TrendingUp,
  Wallet,
  AlertTriangle,
  Package,
  Landmark,
  RefreshCw,
  Sparkles,
  Sun,
} from 'lucide-react';
import { reportsApi } from '@/lib/reports-api';
import { formatApiError } from '@/lib/api-error';
import { formatCurrency } from '@/lib/format-currency';
import type { CoverageDayOption } from '@flp/shared';
import type {
  AnalisisInventarioReport,
  DashboardSummary,
  FlujoCajaReport,
  MetodosPagoReport,
  VentasDiariasReport,
} from '@/types/reports';
import { KpiCard } from './kpi-card';
import { PurchaseSuggestionsTable } from './purchase-suggestions';
import { Button } from '@/components/ui/button';
import { SelectField } from '@/components/ui/select-field';
import { Alert } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const VentasChart = dynamic(
  () => import('./dashboard-charts').then((m) => ({ default: m.VentasChart })),
  { ssr: false, loading: () => <div className="h-72 animate-pulse rounded-lg bg-slate-100" /> },
);
const MetodosPagoChart = dynamic(
  () => import('./dashboard-charts').then((m) => ({ default: m.MetodosPagoChart })),
  { ssr: false, loading: () => <div className="h-72 animate-pulse rounded-lg bg-slate-100" /> },
);
const FlujoCajaChart = dynamic(
  () => import('./dashboard-charts').then((m) => ({ default: m.FlujoCajaChart })),
  { ssr: false, loading: () => <div className="h-72 animate-pulse rounded-lg bg-slate-100" /> },
);

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-20 rounded-xl bg-slate-200/60" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-slate-200/60" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="h-96 rounded-xl bg-slate-200/60" />
        <div className="h-96 rounded-xl bg-slate-200/60" />
      </div>
    </div>
  );
}

type SectionState = 'loading' | 'ok' | 'error' | 'idle';

export default function DashboardContent() {
  const [kpisLoading, setKpisLoading] = useState(true);
  const [error, setError] = useState('');
  const [daysRange, setDaysRange] = useState(30);
  const [cashFlowDays, setCashFlowDays] = useState(90);
  const [coverageDays, setCoverageDays] = useState<CoverageDayOption>(45);
  const [inventarioLoading, setInventarioLoading] = useState(false);

  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [ventas, setVentas] = useState<VentasDiariasReport | null>(null);
  const [metodos, setMetodos] = useState<MetodosPagoReport | null>(null);
  const [inventario, setInventario] = useState<AnalisisInventarioReport | null>(null);
  const [flujo, setFlujo] = useState<FlujoCajaReport | null>(null);
  const [sectionErrors, setSectionErrors] = useState<string[]>([]);
  const [ventasState, setVentasState] = useState<SectionState>('loading');
  const [metodosState, setMetodosState] = useState<SectionState>('loading');
  const [flujoState, setFlujoState] = useState<SectionState>('loading');

  const loadKpis = useCallback(async () => {
    setKpisLoading(true);
    setError('');
    try {
      setDashboard(await reportsApi.dashboard());
    } catch (err) {
      setError(formatApiError(err, 'No se pudieron cargar los KPIs del tablero.'));
    } finally {
      setKpisLoading(false);
    }
  }, []);

  const loadVentas = useCallback(async () => {
    setVentasState('loading');
    try {
      setVentas(await reportsApi.ventasDiarias(daysRange));
      setVentasState('ok');
    } catch (err) {
      setVentas(null);
      setVentasState('error');
      setSectionErrors((prev) => [...new Set([...prev, `Ventas diarias: ${formatApiError(err)}`])]);
    }
  }, [daysRange]);

  const loadMetodos = useCallback(async () => {
    setMetodosState('loading');
    try {
      setMetodos(await reportsApi.metodosPago(daysRange));
      setMetodosState('ok');
    } catch (err) {
      setMetodos(null);
      setMetodosState('error');
      setSectionErrors((prev) => [...new Set([...prev, `Métodos de pago: ${formatApiError(err)}`])]);
    }
  }, [daysRange]);

  const loadFlujo = useCallback(async () => {
    setFlujoState('loading');
    try {
      setFlujo(await reportsApi.flujoCaja(cashFlowDays));
      setFlujoState('ok');
    } catch (err) {
      setFlujo(null);
      setFlujoState('error');
      setSectionErrors((prev) => [...new Set([...prev, `Flujo de caja: ${formatApiError(err)}`])]);
    }
  }, [cashFlowDays]);

  const loadInventario = useCallback(async (days: CoverageDayOption) => {
    setInventarioLoading(true);
    try {
      setInventario(await reportsApi.analisisInventario(days));
    } catch (err) {
      setSectionErrors((prev) => [...new Set([...prev, `Análisis inventario: ${formatApiError(err)}`])]);
    } finally {
      setInventarioLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKpis();
  }, [loadKpis]);

  useEffect(() => {
    loadInventario(coverageDays);
  }, [loadInventario, coverageDays]);

  useEffect(() => {
    loadVentas();
    loadMetodos();
  }, [loadVentas, loadMetodos]);

  useEffect(() => {
    loadFlujo();
  }, [loadFlujo]);

  function handleCoverageChange(days: CoverageDayOption) {
    setCoverageDays(days);
  }

  function refreshAll() {
    setSectionErrors([]);
    setVentasState('loading');
    setMetodosState('loading');
    setFlujoState('loading');
    loadKpis();
    loadVentas();
    loadMetodos();
    loadFlujo();
    loadInventario(coverageDays);
  }

  const categories = useMemo(() => {
    if (!inventario) return [];
    const set = new Set(
      inventario.sugeridosCompra.map((s) => s.category).filter(Boolean) as string[],
    );
    return Array.from(set).sort();
  }, [inventario]);

  if (kpisLoading && !dashboard) {
    return <DashboardSkeleton />;
  }

  const kpis = dashboard?.kpis;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-indigo-500" />
            Tablero
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            KPIs y análisis · tasa BCV {kpis?.tasaBcvActual?.toLocaleString('es-VE') ?? '—'} Bs/USD
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={refreshAll}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}
      {sectionErrors.length > 0 ? (
        <Alert variant="warning">
          Algunas secciones no están disponibles: {sectionErrors.join(' · ')}
        </Alert>
      ) : null}

      {kpis && kpis.tasaBcvActual <= 0 ? (
        <Alert variant="warning">
          No hay tasa BCV registrada. Regístrela en Configuración → Tasa BCV para ver montos en bolívares.
        </Alert>
      ) : null}

      {kpis ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
          <KpiCard
            title="Ventas del día"
            usd={kpis.ventasDiaUsd ?? 0}
            subtitle={`${kpis.ventasDiaTransacciones ?? 0} cobros · USD (Bs a BCV)`}
            icon={Sun}
            accent="default"
          />
          <KpiCard
            title="Ventas del mes"
            usd={kpis.ventasMesUsd}
            ves={kpis.ventasMesVes}
            subtitle="Facturado del mes"
            icon={TrendingUp}
            accent="default"
          />
          <KpiCard
            title="Utilidad bruta"
            usd={kpis.utilidadBrutaMesUsd}
            subtitle={`Margen ${kpis.margenUtilidadPromedio.toFixed(1)}%`}
            icon={Wallet}
            accent="green"
          />
          <KpiCard
            title="CXP esta semana"
            usd={kpis.cxpPorVencerSemanaUsd}
            subtitle={`${kpis.cxpPorVencerSemanaCount} deudas`}
            icon={AlertTriangle}
            accent="amber"
          />
          <KpiCard
            title="Bajo mínimo"
            valueText={String(kpis.productosBajoMinimo)}
            subtitle="productos"
            icon={Package}
            accent="red"
          />
          <KpiCard
            title="Disponibilidad"
            usd={kpis.disponibilidadBancosUsd}
            subtitle="cuentas activas"
            icon={Landmark}
            accent="default"
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Ventas diarias</CardTitle>
            <SelectField
              label=""
              value={String(daysRange)}
              onChange={(e) => setDaysRange(Number(e.target.value))}
            >
              <option value="7">7 días</option>
              <option value="30">30 días</option>
              <option value="90">90 días</option>
            </SelectField>
          </CardHeader>
          <CardContent>
            {ventas ? (
              <VentasChart ventas={ventas} />
            ) : ventasState === 'loading' ? (
              <div className="h-72 text-sm text-slate-400">Cargando…</div>
            ) : (
              <div className="h-72 text-sm text-slate-400 flex items-center justify-center">
                Sin datos de ventas en este período
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Métodos de pago</CardTitle>
            <SelectField
              label=""
              value={String(daysRange)}
              onChange={(e) => setDaysRange(Number(e.target.value))}
            >
              <option value="7">7 días</option>
              <option value="30">30 días</option>
              <option value="90">90 días</option>
            </SelectField>
          </CardHeader>
          <CardContent>
            {metodos ? (
              <MetodosPagoChart metodos={metodos} />
            ) : metodosState === 'loading' ? (
              <div className="h-72 text-sm text-slate-400">Cargando…</div>
            ) : (
              <div className="h-72 text-sm text-slate-400 flex items-center justify-center">
                Sin datos de métodos de pago
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Flujo de caja proyectado</CardTitle>
          <SelectField
            label=""
            value={String(cashFlowDays)}
            onChange={(e) => setCashFlowDays(Number(e.target.value))}
          >
            <option value="30">30 días</option>
            <option value="90">90 días</option>
            <option value="180">180 días</option>
          </SelectField>
        </CardHeader>
        <CardContent>
          {flujo ? (
            <FlujoCajaChart flujo={flujo} />
          ) : flujoState === 'loading' ? (
            <div className="h-72 text-sm text-slate-400">Cargando…</div>
          ) : (
            <div className="h-72 text-sm text-slate-400 flex items-center justify-center">
              Sin proyección de flujo de caja
            </div>
          )}
        </CardContent>
      </Card>

      <PurchaseSuggestionsTable
        items={inventario?.sugeridosCompra ?? []}
        loading={inventarioLoading}
        coverageDays={coverageDays}
        categories={categories}
        onCoverageDaysChange={handleCoverageChange}
      />
    </div>
  );
}
