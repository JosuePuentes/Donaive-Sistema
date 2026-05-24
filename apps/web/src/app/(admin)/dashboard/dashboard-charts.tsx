'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency } from '@/lib/format-currency';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartTooltip } from '@/components/ui/chart-tooltip';
import type { FlujoCajaReport, MetodosPagoReport, VentasDiariasReport } from '@/types/reports';

const PALETTE = {
  indigo: '#4f46e5',
  indigoLight: '#818cf8',
  emerald: '#10b981',
  emeraldLight: '#6ee7b7',
  amber: '#f59e0b',
  rose: '#f43f5e',
  slate: '#94a3b8',
  pie: ['#4f46e5', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f43f5e'],
};

const gridStroke = '#f1f5f9';
const axisTick = { fill: '#94a3b8', fontSize: 11 };

function formatShortDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short' });
}

function ChartLegend() {
  return (
    <Legend
      verticalAlign="bottom"
      height={36}
      iconType="circle"
      formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
    />
  );
}

export function VentasChart({ ventas }: { ventas: VentasDiariasReport | null }) {
  const data =
    ventas?.series.map((p) => ({
      ...p,
      label: formatShortDate(p.fecha),
    })) ?? [];

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Ventas vs. costo (utilidad real)</CardTitle>
        <CardDescription>
          Utilidad con costo congelado al momento de la venta (Kardex)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradVentas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PALETTE.indigo} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={PALETTE.indigo} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradUtilidad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PALETTE.emerald} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={PALETTE.emerald} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v}`}
                width={48}
              />
              <Tooltip content={<ChartTooltip />} />
              <ChartLegend />
              <Area
                type="monotone"
                dataKey="ventasUsd"
                name="Ventas"
                stroke={PALETTE.indigo}
                strokeWidth={2}
                fill="url(#gradVentas)"
              />
              <Area
                type="monotone"
                dataKey="costoMercanciaUsd"
                name="Costo"
                stroke={PALETTE.amber}
                strokeWidth={2}
                fill="transparent"
              />
              <Area
                type="monotone"
                dataKey="utilidadBrutaUsd"
                name="Utilidad"
                stroke={PALETTE.emerald}
                strokeWidth={2}
                fill="url(#gradUtilidad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function MetodosPagoChart({ metodos }: { metodos: MetodosPagoReport | null }) {
  const data =
    metodos?.items.map((m) => ({
      name: m.name,
      value: m.usd,
      porcentaje: m.porcentaje,
    })) ?? [];

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Mix de métodos de pago</CardTitle>
        <CardDescription>
          Total del período:{' '}
          <span className="font-semibold text-slate-900">
            {formatCurrency(metodos?.totalUsd ?? 0)}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={64}
                outerRadius={96}
                paddingAngle={3}
                cornerRadius={6}
                label={({ name, percent }) =>
                  `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                }
                labelLine={{ stroke: PALETTE.slate, strokeWidth: 1 }}
              >
                {data.map((_, idx) => (
                  <Cell key={idx} fill={PALETTE.pie[idx % PALETTE.pie.length]} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function FlujoCajaChart({ flujo }: { flujo: FlujoCajaReport | null }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Flujo de caja proyectado</CardTitle>
        <CardDescription>
          Disponibilidad: {formatCurrency(flujo?.disponibilidadActualUsd ?? 0)} · CxC:{' '}
          {formatCurrency(flujo?.totalesCxC.usd ?? 0)} · CxP:{' '}
          {formatCurrency(flujo?.totalesCxP.usd ?? 0)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={flujo?.flujoSemanal ?? []}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="4 4" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="semana" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v}`}
                width={48}
              />
              <Tooltip content={<ChartTooltip />} />
              <ChartLegend />
              <Bar
                dataKey="ingresosUsd"
                name="Ingresos (CxC)"
                fill={PALETTE.emerald}
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="egresosUsd"
                name="Egresos (CxP)"
                fill={PALETTE.rose}
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="saldoAcumuladoUsd"
                name="Saldo acumulado"
                fill={PALETTE.indigo}
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
