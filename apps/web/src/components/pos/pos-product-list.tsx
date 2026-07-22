'use client';

import { formatCurrency } from '@/lib/format-currency';
import { cn } from '@/lib/cn';
import type { Product } from '@/types/inventory';

export function PosProductList({
  products,
  onSelect,
}: {
  products: Product[];
  onSelect: (product: Product) => void;
}) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <p className="text-sm font-medium">Sin resultados</p>
        <p className="text-xs mt-1">Escriba código, nombre o marca</p>
      </div>
    );
  }

  const otherBranches = products[0]?.branchStocks?.filter((b) => !b.isOwn) ?? [];

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-sm min-w-[720px]">
        <thead className="bg-slate-50 sticky top-0 z-10">
          <tr>
            <th className="text-left p-3 font-semibold text-slate-600">Código</th>
            <th className="text-left p-3 font-semibold text-slate-600">Descripción</th>
            <th className="text-left p-3 font-semibold text-slate-600 hidden sm:table-cell">Marca</th>
            <th className="text-right p-3 font-semibold text-slate-600">Precio</th>
            <th className="text-right p-3 font-semibold text-indigo-700">Mi stock</th>
            {otherBranches.map((b) => (
              <th key={b.branchId} className="text-right p-3 font-semibold text-slate-400 text-xs">
                {b.branchName}
                <span className="block font-normal normal-case text-[10px]">solo consulta</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr
              key={p.id}
              onClick={() => onSelect(p)}
              className={cn(
                'border-t border-slate-100 cursor-pointer transition-colors',
                'hover:bg-indigo-50/60 active:bg-indigo-100/60',
                p.stock <= 0 && 'opacity-70',
              )}
            >
              <td className="p-3 font-mono text-xs text-slate-700">{p.sku}</td>
              <td className="p-3 font-medium text-slate-900">{p.name}</td>
              <td className="p-3 text-slate-500 hidden sm:table-cell">{p.brand || '—'}</td>
              <td className="p-3 text-right tabular-nums">
                <span className="font-semibold text-slate-900">{formatCurrency(p.salePriceUsd)}</span>
                {p.salePriceVes != null && (
                  <span className="block text-xs text-slate-500">{formatCurrency(p.salePriceVes, 'VES')}</span>
                )}
              </td>
              <td className="p-3 text-right tabular-nums font-bold text-indigo-700">{p.stock}</td>
              {p.branchStocks
                ?.filter((b) => !b.isOwn)
                .map((b) => (
                  <td key={b.branchId} className="p-3 text-right tabular-nums text-slate-400">
                    {b.stock}
                  </td>
                ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
