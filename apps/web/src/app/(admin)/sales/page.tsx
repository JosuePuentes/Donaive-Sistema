'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { salesApi, type Sale, type VentasResumen } from '@/lib/sales-api';
import { formatApiError } from '@/lib/api-error';
import { formatCurrency } from '@/lib/format-currency';

function sumCobradoUsd(sale: Sale): number {
  return sale.payments.reduce((s, p) => s + Number(p.amountUsd ?? 0), 0);
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [resumen, setResumen] = useState<VentasResumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resumenWarning, setResumenWarning] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    setResumenWarning('');
    Promise.allSettled([salesApi.list(), salesApi.resumen()])
      .then(([listResult, resumenResult]) => {
        if (listResult.status === 'fulfilled') {
          setSales(listResult.value);
        } else {
          setError(formatApiError(listResult.reason, 'Error al cargar ventas'));
        }
        if (resumenResult.status === 'fulfilled') {
          setResumen(resumenResult.value);
        } else {
          setResumen(null);
          setResumenWarning(formatApiError(resumenResult.reason, 'No se pudo cargar el resumen'));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const listadoTotalCobrado = useMemo(
    () => sales.reduce((s, sale) => s + sumCobradoUsd(sale), 0),
    [sales],
  );

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">Historial de Ventas</h1>
        <p className="text-sm text-zinc-500">
          Totales en USD incluyen pagos en Bs convertidos a la tasa BCV del momento del cobro
        </p>
      </div>

      {resumen && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-[var(--border)] bg-indigo-50/50 p-4">
            <p className="text-xs font-semibold uppercase text-indigo-600">Ventas de hoy (USD)</p>
            <p className="text-2xl font-bold text-indigo-900 tabular-nums mt-1">
              {formatCurrency(resumen.ventasDiaUsd)}
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              {resumen.ventasDiaTransacciones} movimientos de pago · BCV actual{' '}
              {resumen.tasaBcvActual.toLocaleString('es-VE')} Bs/USD
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)] p-4">
            <p className="text-xs font-semibold uppercase text-zinc-500">Ventas del mes (USD)</p>
            <p className="text-2xl font-bold tabular-nums mt-1">
              {formatCurrency(resumen.ventasMesCobradoUsd)}
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              {resumen.ventasMesTransacciones} facturas · Facturado{' '}
              {formatCurrency(resumen.ventasMesFacturadoUsd)} /{' '}
              {formatCurrency(resumen.ventasMesVes, 'VES')}
            </p>
          </div>
        </div>
      )}

      {resumenWarning ? (
        <p className="text-amber-800 text-sm bg-amber-50 border border-amber-200 rounded-lg p-3">{resumenWarning}</p>
      ) : null}

      {error ? <p className="text-red-600 text-sm">{error}</p> : null}

      {loading ? (
        <p className="text-zinc-500">Cargando ventas...</p>
      ) : (
        <>
          <p className="text-sm text-zinc-600">
            Últimas {sales.length} ventas · Total cobrado listado:{' '}
            <strong className="tabular-nums">{formatCurrency(listadoTotalCobrado)}</strong> USD
          </p>
          <div className="space-y-4">
            {sales.map((sale) => {
              const cobradoUsd = sumCobradoUsd(sale);
              return (
                <article
                  key={sale.id}
                  className="border border-[var(--border)] rounded-xl p-4 bg-[var(--background)]"
                >
                  <div className="flex flex-wrap justify-between gap-2 mb-3">
                    <div>
                      <p className="font-mono font-semibold">{sale.number}</p>
                      <p className="text-xs text-zinc-500">
                        {new Date(sale.confirmedAt ?? sale.createdAt).toLocaleString('es-VE')}
                        {sale.cashRegisterSession
                          ? ` · Caja ${sale.cashRegisterSession.sessionNumber}`
                          : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase text-zinc-400">Cobrado (USD)</p>
                      <p className="font-bold text-lg tabular-nums text-indigo-700">
                        {formatCurrency(cobradoUsd)}
                      </p>
                      <p className="text-sm text-zinc-500">
                        Facturado {formatCurrency(Number(sale.totalUsd))} /{' '}
                        {formatCurrency(Number(sale.totalVes), 'VES')}
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs uppercase text-zinc-500 mb-1">Productos</p>
                      <ul className="space-y-1">
                        {sale.details.map((d) => (
                          <li key={d.id}>
                            <span className="font-medium">{d.product.name}</span>
                            {d.product.brand ? (
                              <span className="text-zinc-500"> · {d.product.brand}</span>
                            ) : null}
                            <span className="block text-xs font-mono text-zinc-400">
                              {d.product.barcode
                                ? `Cód. barras: ${d.product.barcode}`
                                : 'Sin código de barras'}
                            </span>
                            × {Number(d.quantity)} — {formatCurrency(Number(d.totalUsd))}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-zinc-500 mb-1">Pagos</p>
                      <ul className="space-y-1">
                        {sale.payments.map((p) => (
                          <li key={p.id}>
                            {p.paymentMethod.name}:{' '}
                            {p.amount < 0 ? '−' : ''}
                            {formatCurrency(Math.abs(Number(p.amount)), p.currency as 'USD' | 'VES')}
                            <span className="text-zinc-400 text-xs ml-1">
                              ({formatCurrency(Number(p.amountUsd ?? 0))} USD)
                            </span>
                            {p.reference === 'VUELTO' ? ' (vuelto)' : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </article>
              );
            })}
            {sales.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">No hay ventas registradas.</p>
            ) : null}
          </div>
        </>
      )}

      <Link href="/dashboard" className="text-sm text-[var(--primary)] underline">
        Ver informes gerenciales
      </Link>
    </div>
  );
}
