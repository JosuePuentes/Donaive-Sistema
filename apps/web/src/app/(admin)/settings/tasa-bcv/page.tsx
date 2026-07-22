'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { tasaBcvApi, type TasaBcv } from '@/lib/tasa-bcv-api';
import { formatApiError, shouldShowLoginLink } from '@/lib/api-error';
import { formatCurrency } from '@/lib/format-currency';

export default function TasaBcvPage() {
  const [tasaActual, setTasaActual] = useState<{ montoBs: number; fecha: string } | null>(null);
  const [historial, setHistorial] = useState<TasaBcv[]>([]);
  const [montoBs, setMontoBs] = useState('');
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [hoy, hist] = await Promise.all([
        tasaBcvApi.getHoy(),
        tasaBcvApi.getHistorial(15),
      ]);
      setHistorial(hist);
      if (hoy.registrada && hoy.montoBs != null) {
        const fecha = hoy.fecha
          ? new Date(hoy.fecha).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];
        setTasaActual({ montoBs: hoy.montoBs, fecha });
        setMontoBs(String(hoy.montoBs));
      } else {
        setTasaActual(null);
      }
    } catch (err) {
      if (shouldShowLoginLink(err)) return;
      setError(formatApiError(err, 'Error al cargar tasa BCV'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await tasaBcvApi.upsertHoy(parseFloat(montoBs), notas || undefined);
      setSuccess('Tasa BCV del día actualizada correctamente');
      await load();
    } catch (err) {
      if (shouldShowLoginLink(err)) return;
      setError(formatApiError(err, 'Error al actualizar'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Tasa BCV</h1>
        <p className="text-sm text-zinc-500">
          Motor multimoneda — 1 USD = X Bs. Los precios en bolívares se calculan dinámicamente;
          las transacciones congelan la tasa del momento.
        </p>
      </div>

      {error ? (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>
      ) : null}
      {success && <p className="text-green-600 text-sm bg-green-50 p-3 rounded-lg">{success}</p>}

      {loading ? (
        <p className="text-zinc-500">Cargando...</p>
      ) : (
        <>
          {tasaActual ? (
            <div className="border border-[var(--border)] rounded-xl p-6 bg-[var(--muted)]">
              <p className="text-sm text-zinc-500">Tasa vigente ({tasaActual.fecha})</p>
              <p className="text-3xl font-bold mt-1">
                1 USD = <span className="text-[var(--primary)]">{tasaActual.montoBs.toLocaleString('es-VE')} Bs</span>
              </p>
              <p className="text-xs text-zinc-500 mt-2">
                Ejemplo: producto a {formatCurrency(10)} = {formatCurrency(10 * tasaActual.montoBs, 'VES')}
              </p>
            </div>
          ) : (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
              No hay tasa BCV registrada. Registre la primera tasa abajo para habilitar compras, ventas y reportes en bolívares.
            </p>
          )}

          <form onSubmit={handleUpdate} className="border border-[var(--border)] rounded-xl p-6 space-y-4">
            <h2 className="font-semibold">Actualizar tasa del día</h2>
            <div>
              <label className="text-sm font-medium">Monto Bs por 1 USD *</label>
              <input
                type="number"
                step="0.000001"
                min="0.000001"
                value={montoBs}
                onChange={(e) => setMontoBs(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)]"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Notas</label>
              <input
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej: Tasa oficial BCV del día"
                className="w-full mt-1 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)]"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar tasa de hoy'}
            </button>
          </form>

          <div>
            <h2 className="font-semibold mb-3">Historial reciente</h2>
            <div className="border border-[var(--border)] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[var(--muted)]">
                  <tr>
                    <th className="text-left p-3">Fecha</th>
                    <th className="text-right p-3">Monto Bs</th>
                    <th className="text-left p-3">Fuente</th>
                    <th className="text-left p-3">Registrado por</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((t) => (
                    <tr key={t.id} className="border-t border-[var(--border)]">
                      <td className="p-3">{new Date(t.fecha).toLocaleDateString('es-VE')}</td>
                      <td className="p-3 text-right font-medium">{Number(t.montoBs).toLocaleString('es-VE')}</td>
                      <td className="p-3">{t.fuente}</td>
                      <td className="p-3 text-xs">
                        {t.usuario ? `${t.usuario.firstName} ${t.usuario.lastName}` : '—'}
                      </td>
                    </tr>
                  ))}
                  {historial.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-zinc-500">
                        Sin historial de tasas
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
