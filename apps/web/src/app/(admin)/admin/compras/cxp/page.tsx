'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { cxpApi } from '@/lib/purchases-api';
import { formatCurrency } from '@/lib/format-currency';
import { CxpPaymentModal } from '@/components/purchases/cxp-payment-modal';
import type { CxpPendiente, CxpResumen } from '@/types/purchases';

export default function CxpPage() {
  const [resumen, setResumen] = useState<CxpResumen | null>(null);
  const [items, setItems] = useState<CxpPendiente[]>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; businessName: string; rif: string }>>([]);
  const [supplierFilter, setSupplierFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<CxpPendiente[]>([]);
  const [showModal, setShowModal] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async (supplierId?: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await cxpApi.pendientes(supplierId);
      setResumen(data.resumen);
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar CxP');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cxpApi.pendientes().then((data) => {
      setSuppliers(
        Array.from(new Map(data.items.map((i) => [i.supplier.id, i.supplier])).values()),
      );
    }).catch(() => {});
  }, []);

  useEffect(() => {
    load(supplierFilter || undefined);
  }, [load, supplierFilter]);

  function toggleSelect(item: CxpPendiente) {
    setSelected((prev) =>
      prev.some((s) => s.id === item.id)
        ? prev.filter((s) => s.id !== item.id)
        : [...prev, item],
    );
  }

  function openAbono(item?: CxpPendiente) {
    setSelected(item ? [item] : selected.length > 0 ? selected : []);
    if (item || selected.length > 0) setShowModal(true);
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Cuentas por Pagar</h1>
          <p className="text-sm text-zinc-500">Control de deudas con proveedores y abonos multimoneda</p>
        </div>
        <button
          type="button"
          onClick={() => openAbono()}
          disabled={selected.length === 0}
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium text-sm disabled:opacity-40"
        >
          Registrar abono ({selected.length})
        </button>
      </div>

      {resumen && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-[var(--border)] rounded-xl p-4 bg-[var(--muted)]">
            <p className="text-xs text-zinc-500 uppercase">Total por pagar (USD)</p>
            <p className="text-2xl font-bold">{formatCurrency(resumen.totalPorPagarUsd)}</p>
          </div>
          <div className="border border-[var(--border)] rounded-xl p-4 bg-[var(--muted)]">
            <p className="text-xs text-zinc-500 uppercase">Total por pagar (Bs)</p>
            <p className="text-2xl font-bold text-[var(--primary)]">
              {formatCurrency(resumen.totalPorPagarVes, 'VES')}
            </p>
          </div>
          <div className="border border-[var(--border)] rounded-xl p-4 bg-[var(--muted)]">
            <p className="text-xs text-zinc-500 uppercase">Deudas / Vencidas</p>
            <p className="text-2xl font-bold">
              {resumen.cantidadDeudas}
              {resumen.cantidadVencidas > 0 && (
                <span className="text-red-600 text-base ml-2">({resumen.cantidadVencidas} vencidas)</span>
              )}
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-3 items-center">
        <label className="text-sm">Filtrar proveedor:</label>
        <select
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value)}
          className="px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm"
        >
          <option value="">Todos</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.businessName}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {loading ? (
        <p className="text-zinc-500">Cargando cuentas por pagar...</p>
      ) : (
        <div className="border border-[var(--border)] rounded-xl overflow-x-auto">
          <table className="w-full text-sm min-w-[960px]">
            <thead className="bg-[var(--muted)]">
              <tr>
                <th className="p-3 w-8"></th>
                <th className="text-left p-3">Proveedor</th>
                <th className="text-left p-3">Nº Factura</th>
                <th className="text-left p-3">Compra</th>
                <th className="text-left p-3">Vencimiento</th>
                <th className="text-center p-3">Retraso</th>
                <th className="text-right p-3">Total orig.</th>
                <th className="text-right p-3">Saldo USD</th>
                <th className="text-right p-3">Saldo Bs</th>
                <th className="text-center p-3">Estado</th>
                <th className="text-right p-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <Fragment key={item.id}>
                  <tr
                    className={`border-t border-[var(--border)] ${item.vencida ? 'bg-red-50/50' : ''}`}
                  >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selected.some((s) => s.id === item.id)}
                      onChange={() => toggleSelect(item)}
                    />
                  </td>
                  <td className="p-3">
                    <p className="font-medium">{item.supplier.businessName}</p>
                    <p className="text-xs text-zinc-500">{item.supplier.rif}</p>
                  </td>
                  <td className="p-3 text-xs">
                    {item.purchase.supplierInvoiceNumber}
                    <br />
                    <span className="text-zinc-500">{item.purchase.supplierControlNumber}</span>
                  </td>
                  <td className="p-3 font-mono text-xs">{item.purchase.number}</td>
                  <td className="p-3">{new Date(item.dueDate).toLocaleDateString('es-VE')}</td>
                  <td className="p-3 text-center">
                    {item.vencida ? (
                      <span className="text-red-600 font-medium">{item.diasRetraso} días</span>
                    ) : (
                      <span className="text-green-600">—</span>
                    )}
                  </td>
                  <td className="p-3 text-right">{formatCurrency(item.totalUsd)}</td>
                  <td className="p-3 text-right font-medium">{formatCurrency(item.saldoPendienteUsd)}</td>
                  <td className="p-3 text-right">{formatCurrency(item.saldoPendienteVes, 'VES')}</td>
                  <td className="p-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      item.status === 'PAID' ? 'bg-green-100 text-green-800' :
                      item.status === 'PARTIAL' ? 'bg-blue-100 text-blue-800' :
                      item.vencida ? 'bg-red-100 text-red-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>{item.status}{item.vencida && item.status !== 'PAID' ? ' / VENCIDA' : ''}</span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => openAbono(item)}
                      className="text-xs text-[var(--primary)] font-medium mr-2"
                    >
                      Abonar
                    </button>
                    {item.pagosRecientes.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                        className="text-xs text-zinc-500 underline"
                      >
                        Abonos ({item.pagosRecientes.length})
                      </button>
                    )}
                  </td>
                </tr>
                {expandedId === item.id && item.pagosRecientes.length > 0 && (
                  <tr key={`${item.id}-abonos`} className="bg-zinc-50">
                    <td colSpan={11} className="p-3 text-xs">
                      <p className="font-medium mb-2">Historial reciente de abonos</p>
                      <ul className="space-y-1">
                        {item.pagosRecientes.map((p) => (
                          <li key={p.id} className="flex justify-between gap-4">
                            <span>{new Date(p.fecha).toLocaleString('es-VE')}</span>
                            <span>
                              {formatCurrency(p.montoPagado, p.moneda as 'USD' | 'VES')} →{' '}
                              {formatCurrency(p.montoAbonadoUsd)} USD
                            </span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-zinc-500">
                    No hay cuentas por pagar pendientes
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <CxpPaymentModal
        open={showModal}
        items={selected}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          setSelected([]);
          load();
        }}
      />
    </div>
  );
}
