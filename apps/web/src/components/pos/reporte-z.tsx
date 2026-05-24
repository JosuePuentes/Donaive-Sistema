'use client';

import { Printer, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/format-currency';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { MoneyDisplay } from '@/components/ui/money-display';
import type { ReporteZ } from '@/lib/caja-api';

function EstadoBadge({ estado }: { estado: 'CUADRADO' | 'SOBRANTE' | 'FALTANTE' }) {
  const map = {
    CUADRADO: {
      icon: CheckCircle2,
      className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
    SOBRANTE: {
      icon: AlertTriangle,
      className: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    FALTANTE: { icon: XCircle, className: 'bg-rose-50 text-rose-800 border-rose-200' },
  };
  const { icon: Icon, className } = map[estado];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border',
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {estado}
    </span>
  );
}

function ReporteZContent({ reporte }: { reporte: ReporteZ }) {
  const { totales } = reporte;
  const alertClass =
    totales.estadoGeneral === 'CUADRADO'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : totales.estadoGeneral === 'SOBRANTE'
        ? 'border-amber-200 bg-amber-50 text-amber-900'
        : 'border-rose-200 bg-rose-50 text-rose-900';

  return (
  <>
      <div className="text-center border-b border-slate-200 pb-4 mb-6 print:border-black">
        <div className="flex justify-center mb-3 print:hidden">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold">
            D
          </div>
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 print:text-black">
          Donaive
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1 print:text-xl">
          Reporte Z — Cierre de caja
        </h1>
        <p className="text-sm text-slate-500 mt-1 print:text-black">
          Documento fiscal de cierre de turno
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-6">
        <div className="rounded-xl bg-slate-50 p-3 print:bg-white print:border print:border-slate-300">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Sesión</p>
          <p className="font-mono font-semibold text-slate-900 mt-1">{reporte.session.sessionNumber}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 print:bg-white print:border print:border-slate-300">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Cajero</p>
          <p className="font-medium text-slate-900 mt-1">{reporte.session.cajero}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 print:bg-white print:border print:border-slate-300">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Apertura</p>
          <p className="text-slate-800 mt-1 text-xs sm:text-sm">
            {new Date(reporte.session.apertura).toLocaleString('es-VE')}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 print:bg-white print:border print:border-slate-300">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Cierre</p>
          <p className="text-slate-800 mt-1 text-xs sm:text-sm">
            {reporte.session.cierre
              ? new Date(reporte.session.cierre).toLocaleString('es-VE')
              : '—'}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm mb-6 print:shadow-none print:border-slate-300">
        <h2 className="font-semibold text-slate-900 mb-2">Ventas del turno</h2>
        <p className="text-sm text-slate-600">{reporte.ventas.cantidad} transacciones</p>
        <MoneyDisplay
          usd={reporte.ventas.totalUsd}
          ves={reporte.ventas.totalVes}
          size="md"
          className="mt-2"
        />
        <p className="text-xs text-slate-500 mt-2">
          Fondo inicial: {formatCurrency(reporte.session.fondoInicialUsd)} +{' '}
          {formatCurrency(reporte.session.fondoInicialVes, 'VES')}
        </p>
      </div>

      <div className="rounded-xl border border-slate-100 bg-white overflow-hidden shadow-sm mb-6 print:shadow-none print:border-slate-300">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-slate-50 print:bg-slate-100">
              <tr>
                <th className="text-left p-3 font-semibold text-slate-600">Método</th>
                <th className="text-right p-3 font-semibold text-slate-600">Esp. USD</th>
                <th className="text-right p-3 font-semibold text-slate-600">Decl. USD</th>
                <th className="text-right p-3 font-semibold text-slate-600">Diff USD</th>
                <th className="text-right p-3 font-semibold text-slate-600">Esp. Bs</th>
                <th className="text-right p-3 font-semibold text-slate-600">Decl. Bs</th>
                <th className="text-right p-3 font-semibold text-slate-600">Diff Bs</th>
                <th className="text-center p-3 font-semibold text-slate-600">Estado</th>
              </tr>
            </thead>
            <tbody>
              {reporte.arqueo.map((line) => (
                <tr key={line.codigo} className="border-t border-slate-100">
                  <td className="p-3 font-medium text-slate-800">{line.metodoPago}</td>
                  <td className="p-3 text-right tabular-nums text-slate-600">
                    {formatCurrency(line.esperadoUsd)}
                  </td>
                  <td className="p-3 text-right tabular-nums">{formatCurrency(line.declaradoUsd)}</td>
                  <td
                    className={cn(
                      'p-3 text-right tabular-nums font-medium',
                      line.diferenciaUsd !== 0 &&
                        (line.diferenciaUsd > 0 ? 'text-amber-600' : 'text-rose-600'),
                    )}
                  >
                    {formatCurrency(line.diferenciaUsd)}
                  </td>
                  <td className="p-3 text-right tabular-nums text-slate-600">
                    {formatCurrency(line.esperadoVes, 'VES')}
                  </td>
                  <td className="p-3 text-right tabular-nums">
                    {formatCurrency(line.declaradoVes, 'VES')}
                  </td>
                  <td
                    className={cn(
                      'p-3 text-right tabular-nums font-medium',
                      line.diferenciaVes !== 0 &&
                        (line.diferenciaVes > 0 ? 'text-amber-600' : 'text-rose-600'),
                    )}
                  >
                    {formatCurrency(line.diferenciaVes, 'VES')}
                  </td>
                  <td className="p-3 text-center">
                    <EstadoBadge estado={line.estado} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={cn('rounded-xl border-2 p-5', alertClass)}>
        <p className="font-bold text-xl">Resultado: {totales.estadoGeneral}</p>
        <p className="text-sm mt-2 tabular-nums">
          Diferencia total: {formatCurrency(totales.diferenciaUsd)} /{' '}
          {formatCurrency(totales.diferenciaVes, 'VES')}
        </p>
        <p className="text-xs mt-2 opacity-80">
          Saldo cierre: {formatCurrency(totales.saldoCierreUsd)} /{' '}
          {formatCurrency(totales.saldoCierreVes, 'VES')}
        </p>
      </div>
  </>
  );
}

export function ReporteZView({ reporte, onClose }: { reporte: ReporteZ; onClose?: () => void }) {
  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 md:p-8 print:max-w-none print:p-0">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 sm:p-8 shadow-lg print:shadow-none print:border-0 print:rounded-none print:hidden">
          <ReporteZContent reporte={reporte} />
          <div className="flex flex-col sm:flex-row gap-3 mt-8 print:hidden">
            <Button type="button" onClick={() => window.print()} className="flex-1">
              <Printer className="h-4 w-4" />
              Imprimir Reporte Z
            </Button>
            {onClose && (
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                Volver al inicio
              </Button>
            )}
          </div>
        </div>

        <div id="reporte-z-print" className="hidden print:block">
          <ReporteZContent reporte={reporte} />
        </div>
      </div>
    </div>
  );
}
