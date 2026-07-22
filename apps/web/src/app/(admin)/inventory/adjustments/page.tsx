'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { inventoryApi, productsApi } from '@/lib/inventory-api';
import { ApiError, formatApiError } from '@/lib/api-error';
import type { Product, InventoryAdjustment } from '@/types/inventory';
import { ADJUSTMENT_REASONS, SHRINKAGE_REASONS } from '@/types/inventory';

type Tab = 'adjustment' | 'shrinkage';

interface LineForm {
  productId: string;
  movementType: 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT';
  quantity: number;
  notes: string;
}

interface ShrinkageLineForm {
  productId: string;
  quantity: number;
  notes: string;
}

export default function AdjustmentsPage() {
  const [tab, setTab] = useState<Tab>('adjustment');
  const [products, setProducts] = useState<Product[]>([]);
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);
  const [reason, setReason] = useState('COUNT_CORRECTION');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineForm[]>([
    { productId: '', movementType: 'ADJUSTMENT_IN', quantity: 1, notes: '' },
  ]);
  const [shrinkageLines, setShrinkageLines] = useState<ShrinkageLineForm[]>([
    { productId: '', quantity: 1, notes: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    try {
      const [prodRes, adjRes] = await Promise.all([
        productsApi.listAll({ isActive: true }),
        inventoryApi.adjustments(),
      ]);
      setProducts(prodRes.data);
      setAdjustments(adjRes.data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      setError(formatApiError(err, 'Error al cargar datos'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (tab === 'adjustment') {
        const result = await inventoryApi.createAdjustment({
          reason,
          notes: notes || undefined,
          lines: lines.filter((l) => l.productId && l.quantity > 0),
        });
        setSuccess(`Ajuste ${result.number} registrado. Stock actualizado en kardex.`);
      } else {
        const result = await inventoryApi.createShrinkage({
          reason,
          notes: notes || undefined,
          lines: shrinkageLines.filter((l) => l.productId && l.quantity > 0),
        });
        setSuccess(`Merma ${result.number} registrada. Stock actualizado en kardex.`);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ajustes y Mermas</h1>
        <p className="text-sm text-zinc-500">Modifica el inventario con trazabilidad en kardex</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => { setTab('adjustment'); setReason('COUNT_CORRECTION'); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'adjustment' ? 'bg-[var(--primary)] text-white' : 'border border-[var(--border)]'}`}
        >
          Ajuste de inventario
        </button>
        <button
          onClick={() => { setTab('shrinkage'); setReason('DAMAGE'); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'shrinkage' ? 'bg-[var(--primary)] text-white' : 'border border-[var(--border)]'}`}
        >
          Merma
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p>{error}</p>
          {error.includes('Sesión expirada') && (
            <Link href="/login" className="inline-block mt-2 font-medium underline">
              Ir a iniciar sesión
            </Link>
          )}
        </div>
      )}
      {success && <p className="text-green-600 text-sm bg-green-50 p-3 rounded-lg">{success}</p>}

      <form onSubmit={handleSubmit} className="border border-[var(--border)] rounded-xl p-6 space-y-4 bg-[var(--muted)]">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Motivo</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)]"
            >
              {(tab === 'adjustment' ? ADJUSTMENT_REASONS : SHRINKAGE_REASONS).map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Notas</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)]"
              placeholder="Justificación opcional"
            />
          </div>
        </div>

        {tab === 'adjustment' ? (
          <AdjustmentLines products={products} lines={lines} setLines={setLines} />
        ) : (
          <ShrinkageLines products={products} lines={shrinkageLines} setLines={setShrinkageLines} />
        )}

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {loading ? 'Procesando...' : tab === 'adjustment' ? 'Registrar ajuste' : 'Registrar merma'}
        </button>
      </form>

      <div>
        <h2 className="text-lg font-semibold mb-3">Historial reciente</h2>
        <div className="overflow-x-auto border border-[var(--border)] rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted)]">
              <tr>
                <th className="text-left p-3">Número</th>
                <th className="text-left p-3">Motivo</th>
                <th className="text-left p-3">Líneas</th>
                <th className="text-left p-3">Usuario</th>
                <th className="text-left p-3">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.map((a) => (
                <tr key={a.id} className="border-t border-[var(--border)]">
                  <td className="p-3 font-mono text-xs">{a.number}</td>
                  <td className="p-3">{a.reason}</td>
                  <td className="p-3">
                    {a.lines.map((l) => (
                      <p key={l.id} className="text-xs">
                        {l.product.name}: {l.movementType.includes('IN') ? '+' : '-'}{Number(l.quantity)}
                      </p>
                    ))}
                  </td>
                  <td className="p-3 text-xs">{a.createdBy.firstName} {a.createdBy.lastName}</td>
                  <td className="p-3 text-xs">{new Date(a.createdAt).toLocaleString('es-VE')}</td>
                </tr>
              ))}
              {adjustments.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-500">Sin registros</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdjustmentLines({
  products,
  lines,
  setLines,
}: {
  products: Product[];
  lines: LineForm[];
  setLines: (l: LineForm[]) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Líneas de ajuste</p>
      {lines.map((line, i) => (
        <div key={i} className="grid grid-cols-4 gap-2 items-end">
          <div className="col-span-2">
            <select
              value={line.productId}
              onChange={(e) => {
                const next = [...lines];
                next[i] = { ...line, productId: e.target.value };
                setLines(next);
              }}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm"
              required
            >
              <option value="">Seleccionar producto</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.sku} — {p.name} (stock: {p.stock})</option>
              ))}
            </select>
          </div>
          <select
            value={line.movementType}
            onChange={(e) => {
              const next = [...lines];
              next[i] = { ...line, movementType: e.target.value as LineForm['movementType'] };
              setLines(next);
            }}
            className="px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm"
          >
            <option value="ADJUSTMENT_IN">Entrada (+)</option>
            <option value="ADJUSTMENT_OUT">Salida (-)</option>
          </select>
          <input
            type="number"
            min="0.0001"
            step="any"
            value={line.quantity}
            onChange={(e) => {
              const next = [...lines];
              next[i] = { ...line, quantity: Number(e.target.value) };
              setLines(next);
            }}
            className="px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm"
            required
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => setLines([...lines, { productId: '', movementType: 'ADJUSTMENT_IN', quantity: 1, notes: '' }])}
        className="text-sm text-[var(--primary)]"
      >
        + Agregar línea
      </button>
    </div>
  );
}

function ShrinkageLines({
  products,
  lines,
  setLines,
}: {
  products: Product[];
  lines: ShrinkageLineForm[];
  setLines: (l: ShrinkageLineForm[]) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Líneas de merma (solo salidas)</p>
      {lines.map((line, i) => (
        <div key={i} className="grid grid-cols-3 gap-2 items-end">
          <div className="col-span-2">
            <select
              value={line.productId}
              onChange={(e) => {
                const next = [...lines];
                next[i] = { ...line, productId: e.target.value };
                setLines(next);
              }}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm"
              required
            >
              <option value="">Seleccionar producto</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.sku} — {p.name} (stock: {p.stock})</option>
              ))}
            </select>
          </div>
          <input
            type="number"
            min="0.0001"
            step="any"
            value={line.quantity}
            onChange={(e) => {
              const next = [...lines];
              next[i] = { ...line, quantity: Number(e.target.value) };
              setLines(next);
            }}
            className="px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm"
            required
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => setLines([...lines, { productId: '', quantity: 1, notes: '' }])}
        className="text-sm text-[var(--primary)]"
      >
        + Agregar línea
      </button>
    </div>
  );
}
