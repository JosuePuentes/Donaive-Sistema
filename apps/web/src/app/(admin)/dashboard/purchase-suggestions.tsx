'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileDown, ShoppingCart, AlertTriangle } from 'lucide-react';
import { COVERAGE_DAY_OPTIONS, getRunwayVisualStatus, type CoverageDayOption } from '@flp/shared';
import { formatCurrency } from '@/lib/format-currency';
import { MoneyInline } from '@/components/ui/money-display';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { savePurchaseDraft } from '@/lib/purchase-draft';
import type { SugeridoCompraItem } from '@/types/reports';

function RunwayBar({
  runwayDays,
  stock,
  vmd,
  coverageTargetDays,
}: {
  runwayDays: number | null;
  stock: number;
  vmd: number;
  coverageTargetDays: number;
}) {
  const status = getRunwayVisualStatus(runwayDays, stock, vmd);
  const pct =
    runwayDays != null && coverageTargetDays > 0
      ? Math.min(100, (runwayDays / coverageTargetDays) * 100)
      : status === 'no_rotation'
        ? 100
        : 0;

  const barColor = {
    healthy: 'bg-emerald-500',
    warning: 'bg-amber-500',
    critical: 'bg-rose-500',
    stockout: 'bg-rose-600',
    no_rotation: 'bg-slate-300',
  }[status];

  const label = {
    healthy: `~${runwayDays?.toFixed(1)} días`,
    warning: `~${runwayDays?.toFixed(1)} días`,
    critical: runwayDays === 0 ? 'Quiebre' : `~${runwayDays?.toFixed(1)} días`,
    stockout: 'Quiebre de stock',
    no_rotation: vmd <= 0 && stock > 0 ? 'Sin rotación' : '—',
  }[status];

  return (
    <div className="min-w-[140px]">
      <div className="flex justify-between text-[10px] text-slate-500 mb-1">
        <span>{label}</span>
        {runwayDays != null && coverageTargetDays > 0 ? (
          <span className="tabular-nums">{pct.toFixed(0)}%</span>
        ) : null}
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-300', barColor)}
          style={{ width: `${Math.max(status === 'stockout' ? 100 : pct, 4)}%` }}
        />
      </div>
    </div>
  );
}

function PurchaseOrderPrint({
  items,
  generatedAt,
  coverageDays,
}: {
  items: SugeridoCompraItem[];
  generatedAt: string;
  coverageDays: number;
}) {
  const total = items.reduce((s, i) => s + i.estimatedOrderUsd, 0);

  return (
    <div id="orden-compra-print" className="hidden print:block p-8 text-sm">
      <h1 className="text-xl font-bold mb-1">Orden de Compra Sugerida — Donaive</h1>
      <p className="text-slate-600 mb-1">Generada: {generatedAt}</p>
      <p className="text-slate-600 mb-4">Cobertura objetivo: {coverageDays} días</p>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">SKU</th>
            <th className="text-left py-2">Producto</th>
            <th className="text-right py-2">Stock</th>
            <th className="text-right py-2">VMD</th>
            <th className="text-right py-2">Días stock</th>
            <th className="text-right py-2">Cant. Sugerida</th>
            <th className="text-right py-2">Est. USD</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.productId} className="border-b border-slate-200">
              <td className="py-2 font-mono">{item.sku}</td>
              <td className="py-2">{item.name}</td>
              <td className="py-2 text-right">{item.stock}</td>
              <td className="py-2 text-right">{item.vmd.toFixed(2)}</td>
              <td className="py-2 text-right">
                {item.runwayDays != null ? item.runwayDays.toFixed(1) : '—'}
              </td>
              <td className="py-2 text-right font-medium">{item.suggestedQty}</td>
              <td className="py-2 text-right">{formatCurrency(item.estimatedOrderUsd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 font-bold text-right">Total estimado: {formatCurrency(total)}</p>
    </div>
  );
}

export function PurchaseSuggestionsTable({
  items,
  categories,
  coverageDays,
  onCoverageDaysChange,
  loading = false,
}: {
  items: SugeridoCompraItem[];
  categories: string[];
  coverageDays: CoverageDayOption;
  onCoverageDaysChange: (days: CoverageDayOption) => void;
  loading?: boolean;
}) {
  const router = useRouter();
  const [categoryFilter, setCategoryFilter] = useState('');
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        if (emergencyOnly && !item.emergency) return false;
        if (categoryFilter && item.category !== categoryFilter) return false;
        return true;
      }),
    [items, categoryFilter, emergencyOnly],
  );

  const generatedAt = new Date().toLocaleString('es-VE');

  function toggleSelect(productId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  function selectAllVisible() {
    setSelected(new Set(filtered.map((i) => i.productId)));
  }

  function addToPurchaseOrder(rows: SugeridoCompraItem[]) {
    if (rows.length === 0) return;
    savePurchaseDraft(
      rows.map((item) => ({
        productId: item.productId,
        sku: item.sku,
        name: item.name,
        quantity: item.suggestedQty,
        costUsd: item.costUsd,
        marginPercent: item.marginPercent,
      })),
    );
    router.push('/admin/compras/nueva');
  }

  const selectedItems = filtered.filter((i) => selected.has(i.productId));

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Motor de recomendaciones de compra</CardTitle>
            <CardDescription>
              VMD (últimos 30 días) · Runway = stock ÷ VMD · Sugerido = (VMD × cobertura) − stock
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                Cobertura objetivo
              </label>
              <select
                value={coverageDays}
                disabled={loading}
                onChange={(e) =>
                  onCoverageDaysChange(Number(e.target.value) as CoverageDayOption)
                }
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {COVERAGE_DAY_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d} días
                  </option>
                ))}
              </select>
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={emergencyOnly}
                onChange={(e) => setEmergencyOnly(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Solo emergencia
            </label>
            <Button type="button" size="sm" variant="secondary" onClick={selectAllVisible}>
              Seleccionar visibles
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => addToPurchaseOrder(selectedItems)}
              disabled={selectedItems.length === 0}
            >
              <ShoppingCart className="h-4 w-4" />
              Añadir ({selectedItems.length})
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => window.print()}
              disabled={filtered.length === 0}
            >
              <FileDown className="h-4 w-4" />
              PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto rounded-b-xl">
            <table className="w-full text-sm min-w-[1100px]">
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50/80">
                  <th className="w-10 py-4 px-4" />
                  <th className="text-left py-4 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Producto
                  </th>
                  <th className="text-right py-4 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Stock actual
                  </th>
                  <th className="text-right py-4 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Ritmo (VMD)
                  </th>
                  <th className="text-left py-4 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 min-w-[160px]">
                    Cobertura actual
                  </th>
                  <th className="text-right py-4 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Cant. sugerida
                  </th>
                  <th className="text-right py-4 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Est. USD
                  </th>
                  <th className="text-right py-4 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr
                    key={item.productId}
                    className={cn(
                      'border-t border-slate-50 transition-colors duration-150 hover:bg-slate-50/80',
                      item.emergency && 'bg-rose-50/50 hover:bg-rose-50/80',
                    )}
                  >
                    <td className="py-4 px-4">
                      <input
                        type="checkbox"
                        checked={selected.has(item.productId)}
                        onChange={() => toggleSelect(item.productId)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-medium text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{item.sku}</p>
                      {item.barcode ? (
                        <p className="text-[10px] text-slate-400 font-mono">{item.barcode}</p>
                      ) : null}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {item.abcClass}
                        </span>
                        {item.stockout ? (
                          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                            Quiebre
                          </span>
                        ) : null}
                        {item.lostSalesRisk ? (
                          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 inline-flex items-center gap-0.5">
                            <AlertTriangle className="h-3 w-3" />
                            Venta perdida ~{item.estimatedLostUnits.toFixed(0)} u.
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right font-semibold tabular-nums">{item.stock}</td>
                    <td className="py-4 px-4 text-right tabular-nums">
                      <span className="font-semibold text-slate-900">{item.vmd.toFixed(2)}</span>
                      <span className="text-[10px] text-slate-400 block">u./día</span>
                      <span className="text-[10px] text-slate-400">{item.unitsSold30d} en 30d</span>
                    </td>
                    <td className="py-4 px-4">
                      <RunwayBar
                        runwayDays={item.runwayDays}
                        stock={item.stock}
                        vmd={item.vmd}
                        coverageTargetDays={item.coverageTargetDays}
                      />
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-indigo-600 tabular-nums text-lg">
                      {item.suggestedQty}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <MoneyInline amount={item.estimatedOrderUsd} />
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => addToPurchaseOrder([item])}
                        disabled={item.suggestedQty <= 0}
                      >
                        Añadir a orden
                      </Button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-500">
                      {loading
                        ? 'Recalculando recomendaciones...'
                        : 'No hay productos que requieran reposición con los filtros actuales.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <PurchaseOrderPrint
        items={filtered}
        generatedAt={generatedAt}
        coverageDays={coverageDays}
      />
    </>
  );
}
