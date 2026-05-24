'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  TrendingUp,
  Wallet,
  AlertTriangle,
  Package,
  Landmark,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { reportsApi } from '@/lib/reports-api';
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
import { FlujoCajaChart, MetodosPagoChart, VentasChart } from './dashboard-charts';
import { PurchaseSuggestionsTable } from './purchase-suggestions';
import { Button } from '@/components/ui/button';
import { SelectField } from '@/components/ui/select-field';
import { Alert } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

export default function DashboardContent() {
  const [loading, setLoading] = useState(true);
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

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    setSectionErrors([]);

    const results = await Promise.allSettled([
      reportsApi.dashboard(),
      reportsApi.ventasDiarias(daysRange),
      reportsApi.metodosPago(daysRange),
      reportsApi.analisisInventario(coverageDays),
      reportsApi.flujoCaja(cashFlowDays),
    ]);

    const errors: string[] = [];
    if (results[0].status === 'fulfilled') setDashboard(results[0].value);
    else errors.push('KPIs');

    if (results[1].status === 'fulfilled') setVentas(results[1].value);
    else errors.push('Ventas diarias');

    if (results[2].status === 'fulfilled') setMetodos(results[2].value);
    else errors.push('Métodos de pago');

    if (results[3].status === 'fulfilled') setInventario(results[3].value);
    else errors.push('Inventario');

    if (results[4].status === 'fulfilled') setFlujo(results[4].value);
    else errors.push('Flujo de caja');

    setSectionErrors(errors);
    if (errors.length === results.length) {
      setError('No tiene permisos para ver ningún reporte.');
    }
    setLoading(false);
  }, [daysRange, cashFlowDays, coverageDays]);

  const reloadInventario = useCallback(async (days: CoverageDayOption) => {
    setInventarioLoading(true);
    try {
      const data = await reportsApi.analisisInventario(days);
      setInventario(data);
    } catch {
      setSectionErrors((prev) => [...new Set([...prev, 'Análisis inventario'])]);
    } finally {
      setInventarioLoading(false);
    }
  }, []);

  function handleCoverageChange(days: CoverageDayOption) {
    setCoverageDays(days);
    reloadInventario(days);
  }

  useEffect(() => {
    loadData();
  }, [loadData]);

  const categories = useMemo(() => {
    if (!inventario) return [];
    const set = new Set(
      inventario.sugeridosCompra.map((s) => s.category).filter(Boolean) as string[],
    );
    return Array.from(set).sort();
  }, [inventario]);

  if (loading && !dashboard) {
    return <DashboardSkeleton />;
  }

  const kpis = dashboard?.kpis;

  return (
    <div className="space-y-8 max-w-[1400px] print:hidden">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            Panel gerencial
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Informes y planificación
          </h1>
          <p className="text-slate-500 mt-2 max-w-xl text-sm leading-relaxed">
            Libro de ventas, análisis de compras y proyección de flujo de caja en tiempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3 p-4 rounded-xl border border-slate-100 bg-white shadow-sm">
          <SelectField label="Período ventas" value={daysRange} onChange={(e) => setDaysRange(Number(e.target.value))}>
            <option value={7}>7 días</option>
            <option value={30}>30 días</option>
            <option value={60}>60 días</option>
          </SelectField>
          <SelectField label="Flujo de caja" value={cashFlowDays} onChange={(e) => setCashFlowDays(Number(e.target.value))}>
            <option value={30}>30 días</option>
            <option value={60}>60 días</option>
            <option value={90}>90 días</option>
          </SelectField>
          <Button type="button" variant="secondary" onClick={loadData} className="mb-0.5">
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        </div>
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      {sectionErrors.length > 0 && !error ? (
        <Alert variant="warning">
          Algunas secciones no están disponibles por permisos: {sectionErrors.join(', ')}.
        </Alert>
      ) : null}

      {kpis ? (
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          <KpiCard
            title="Ventas del mes"
            usd={kpis.ventasMesUsd}
            ves={kpis.ventasMesVes}
            subtitle={`Tasa BCV ${kpis.tasaBcvActual.toFixed(2)} Bs/USD`}
            icon={TrendingUp}
          />
          <KpiCard
            title="Margen utilidad"
            valueText={`${kpis.margenUtilidadPromedio.toFixed(1)}%`}
            subtitle={`Utilidad bruta ${formatCurrency(kpis.utilidadBrutaMesUsd)}`}
            accent="green"
            icon={Wallet}
          />
          <KpiCard
            title="CxP esta semana"
            usd={kpis.cxpPorVencerSemanaUsd}
            ves={kpis.cxpPorVencerSemanaVes}
            subtitle={`${kpis.cxpPorVencerSemanaCount} documento(s)`}
            accent="amber"
            icon={Landmark}
          />
          <KpiCard
            title="Stock bajo mínimo"
            valueText={String(kpis.productosBajoMinimo)}
            subtitle="Productos en alerta de reposición"
            accent={kpis.productosBajoMinimo > 0 ? 'red' : 'default'}
            icon={Package}
          />
          <KpiCard
            title="Disponibilidad bancos"
            usd={kpis.disponibilidadBancosUsd}
            subtitle="Saldo consolidado en cuentas"
            icon={AlertTriangle}
          />
        </section>
      ) : null}

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <VentasChart ventas={ventas} />
        <MetodosPagoChart metodos={metodos} />
      </section>

      <FlujoCajaChart flujo={flujo} />

      {inventario ? (
        <>
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>High-runners (clase A)</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {inventario.highRunners.map((p) => (
                    <li
                      key={p.productId}
                      className="flex justify-between gap-4 py-2 border-b border-slate-50 last:border-0"
                    >
                      <span className="text-sm text-slate-800 font-medium truncate">{p.name}</span>
                      <span className="text-xs text-slate-500 shrink-0 tabular-nums">
                        VMD: {p.vmd.toFixed(2)} u./día ({p.unitsSold30d} en 30d)
                      </span>
                    </li>
                  ))}
                  {inventario.highRunners.length === 0 && (
                    <li className="text-sm text-slate-500 py-4 text-center">Sin datos de rotación</li>
                  )}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Productos estancados</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {inventario.deadStock.map((p) => (
                    <li
                      key={p.productId}
                      className="flex justify-between gap-4 py-2 border-b border-slate-50 last:border-0"
                    >
                      <span className="text-sm text-slate-800 font-medium truncate">{p.name}</span>
                      <span className="text-xs text-slate-500 shrink-0">Stock: {p.stock}</span>
                    </li>
                  ))}
                  {inventario.deadStock.length === 0 && (
                    <li className="text-sm text-slate-500 py-4 text-center">
                      Sin productos estancados
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>
          </section>
          <PurchaseSuggestionsTable
            items={inventario.sugeridosCompra}
            categories={categories}
            coverageDays={coverageDays}
            onCoverageDaysChange={handleCoverageChange}
            loading={inventarioLoading}
          />
        </>
      ) : null}
    </div>
  );
}
