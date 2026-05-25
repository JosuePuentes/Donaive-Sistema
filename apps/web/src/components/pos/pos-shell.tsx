'use client';

import Link from 'next/link';
import { FileText, Home, Store } from 'lucide-react';
import { formatCurrency } from '@/lib/format-currency';
import { Button } from '@/components/ui/button';
import type { EstadoCaja } from '@/lib/caja-api';

export function PosShell({
  estado,
  children,
  onReporteX,
  onCerrarCaja,
}: {
  estado: EstadoCaja;
  children: React.ReactNode;
  onReporteX: () => void;
  onCerrarCaja: () => void;
}) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="shrink-0 border-b border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-sm shadow-indigo-600/25">
              D
            </div>
            <div>
              <p className="font-bold text-slate-900 tracking-tight leading-none">Donaive</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5">
                Punto de venta
              </p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-6 text-sm">
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Sesión activa
              </p>
              <p className="font-mono font-semibold text-slate-800">{estado.session.sessionNumber}</p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Ventas del turno (USD)
              </p>
              <p className="font-semibold tabular-nums text-slate-900">
                {estado.resumenVentas.cantidadVentas} ventas ·{' '}
                {formatCurrency(estado.resumenVentas.totalCobradoUsd ?? estado.resumenVentas.totalVentasUsd)}
              </p>
              <p className="text-xs text-slate-500 tabular-nums">
                Bs recibidos: {formatCurrency(estado.resumenVentas.totalBsRecibidos ?? 0, 'VES')}
                {' · '}Incluye pagos en Bs a tasa BCV del momento
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={onReporteX}>
              <FileText className="h-4 w-4" />
              Reporte X
            </Button>
            <Button type="button" variant="danger" size="sm" onClick={onCerrarCaja}>
              <Store className="h-4 w-4" />
              Cerrar caja
            </Button>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-100 transition-all duration-200"
            >
              <Home className="h-4 w-4" />
              Inicio
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
