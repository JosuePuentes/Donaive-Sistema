'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Home, Lock, Wallet } from 'lucide-react';
import { roundCurrency, BASE_CURRENCY } from '@flp/shared';
import { cajaApi, type EstadoCaja, type ReporteZ } from '@/lib/caja-api';
import { formatApiError, shouldShowLoginLink } from '@/lib/api-error';
import { formatCurrency } from '@/lib/format-currency';
import { ReporteZView } from '@/components/pos/reporte-z';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

interface AperturaCajaProps {
  onSuccess: (estado: EstadoCaja) => void;
}

export function AperturaCajaScreen({ onSuccess }: AperturaCajaProps) {
  const [usd, setUsd] = useState('50');
  const [ves, setVes] = useState('500');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await cajaApi.apertura(parseFloat(usd) || 0, parseFloat(ves) || 0);
      const estado = await cajaApi.estadoActual();
      if ('abierta' in estado && !estado.abierta) throw new Error('Error al abrir caja');
      onSuccess(estado as EstadoCaja);
    } catch (err) {
      if (shouldShowLoginLink(err)) return;
      setError(formatApiError(err, 'Error al abrir caja'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-100">
      <div className="mb-8 flex flex-col items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-white font-bold text-2xl shadow-lg shadow-indigo-600/30">
          D
        </div>
        <p className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Donaive</p>
        <p className="text-sm text-slate-500 mt-1">Punto de venta</p>
      </div>

      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-indigo-700 shadow-sm hover:bg-indigo-50 transition-colors"
      >
        <Home className="h-4 w-4" />
        Inicio
      </Link>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-900/10 space-y-6"
      >
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600 mb-4">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Apertura de caja</h1>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            Ingrese el fondo inicial en efectivo para dar cambio antes de facturar
          </p>
        </div>

        {error ? (
          <Alert variant="danger">
            {error}
            {error.includes('cuenta de caja') ? (
              <>
                {' '}
                <Link href="/banks" className="underline font-medium">
                  Configurar bancos
                </Link>
              </>
            ) : null}
          </Alert>
        ) : null}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Fondo USD
            </label>
            <div className="relative mt-2">
              <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="number"
                step="0.01"
                min="0"
                value={usd}
                onChange={(e) => setUsd(e.target.value)}
                className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-200 bg-white text-xl font-bold tabular-nums text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 transition-all duration-200"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Fondo Bs
            </label>
            <div className="relative mt-2">
              <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="number"
                step="0.01"
                min="0"
                value={ves}
                onChange={(e) => setVes(e.target.value)}
                className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-200 bg-white text-xl font-bold tabular-nums text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 transition-all duration-200"
              />
            </div>
          </div>
        </div>

        <Button type="submit" size="lg" disabled={loading} className="w-full">
          {loading ? 'Abriendo caja...' : 'Abrir caja e iniciar turno'}
        </Button>
      </form>
    </div>
  );
}

interface CierreCajaProps {
  estado: EstadoCaja;
  onClosed: (reporte: ReporteZ) => void;
  onCancel: () => void;
}

export function CierreCajaScreen({ estado, onClosed, onCancel }: CierreCajaProps) {
  const [declarations, setDeclarations] = useState<Record<string, { usd: string; ves: string }>>(() => {
    const init: Record<string, { usd: string; ves: string }> = {};
    for (const line of estado.arqueoEsperado) {
      init[line.paymentMethodId] = {
        usd: String(line.montoEsperadoUsd),
        ves: String(line.montoEsperadoVes),
      };
    }
    return init;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const lineas = estado.arqueoEsperado.map((line) => ({
        paymentMethodId: line.paymentMethodId,
        montoDeclaradoUsd: roundCurrency(
          parseFloat(declarations[line.paymentMethodId]?.usd ?? '0') || 0,
          BASE_CURRENCY,
        ),
        montoDeclaradoVes: roundCurrency(
          parseFloat(declarations[line.paymentMethodId]?.ves ?? '0') || 0,
          'VES',
        ),
      }));
      const reporte = await cajaApi.cierre(lineas);
      onClosed(reporte);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cerrar caja');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Cierre de caja — Arqueo</h1>
        <p className="text-sm text-slate-500 mt-1">
          Sesión <span className="font-mono font-medium">{estado.session.sessionNumber}</span> ·{' '}
          {estado.resumenVentas.cantidadVentas} ventas ·{' '}
          {formatCurrency(estado.resumenVentas.totalVentasUsd)} /{' '}
          {formatCurrency(estado.resumenVentas.totalVentasVes, 'VES')}
        </p>
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl border border-slate-100 bg-white overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3 font-semibold text-slate-600">Método de pago</th>
                <th className="text-right p-3 font-semibold text-slate-600">Esperado USD</th>
                <th className="text-right p-3 font-semibold text-slate-600">Contado USD</th>
                <th className="text-right p-3 font-semibold text-slate-600">Esperado Bs</th>
                <th className="text-right p-3 font-semibold text-slate-600">Contado Bs</th>
              </tr>
            </thead>
            <tbody>
              {estado.arqueoEsperado.map((line) => (
                <tr key={line.paymentMethodId} className="border-t border-slate-100">
                  <td className="p-3 font-medium text-slate-800">{line.paymentMethodName}</td>
                  <td className="p-3 text-right text-slate-500 tabular-nums">
                    {formatCurrency(line.montoEsperadoUsd)}
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={declarations[line.paymentMethodId]?.usd ?? ''}
                      onChange={(e) =>
                        setDeclarations((prev) => ({
                          ...prev,
                          [line.paymentMethodId]: {
                            ...prev[line.paymentMethodId],
                            usd: e.target.value,
                          },
                        }))
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-right tabular-nums font-semibold focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
                    />
                  </td>
                  <td className="p-3 text-right text-slate-500 tabular-nums">
                    {formatCurrency(line.montoEsperadoVes, 'VES')}
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={declarations[line.paymentMethodId]?.ves ?? ''}
                      onChange={(e) =>
                        setDeclarations((prev) => ({
                          ...prev,
                          [line.paymentMethodId]: {
                            ...prev[line.paymentMethodId],
                            ves: e.target.value,
                          },
                        }))
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-right tabular-nums font-semibold focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-500">
          Al confirmar se genera el Reporte Z con los totales congelados del turno.
        </p>

        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" variant="danger" size="lg" disabled={loading} className="flex-1">
            {loading ? 'Cerrando caja...' : 'Confirmar cierre y Reporte Z'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function PosReporteZScreen({
  reporte,
  onDone,
}: {
  reporte: ReporteZ;
  onDone: () => void;
}) {
  return <ReporteZView reporte={reporte} onClose={onDone} />;
}
