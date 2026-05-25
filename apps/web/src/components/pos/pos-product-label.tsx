import type { Product } from '@/types/inventory';
import { formatCurrency } from '@/lib/format-currency';

/** Etiqueta de producto en POS: código de barras, no SKU interno. */
export function PosProductLabel({
  product,
  compact = false,
}: {
  product: Pick<Product, 'name' | 'barcode' | 'brand' | 'description' | 'salePriceUsd' | 'salePriceVes' | 'stock'>;
  compact?: boolean;
}) {
  const codigoBarras = product.barcode?.trim() || 'Sin código de barras';

  if (compact) {
    return (
      <>
        <p className="font-medium text-sm text-slate-900 truncate leading-snug">{product.name}</p>
        <p className="text-xs text-slate-600 font-mono truncate">Cód. barras: {codigoBarras}</p>
        {product.brand ? (
          <p className="text-xs text-slate-500 truncate">{product.brand}</p>
        ) : null}
      </>
    );
  }

  return (
    <>
      <p className="font-semibold text-sm text-slate-900 line-clamp-2 leading-snug min-h-[2.5rem]">
        {product.name}
      </p>
      <p className="text-[11px] font-mono text-indigo-700 mt-1 truncate">Cód. barras: {codigoBarras}</p>
      {product.description ? (
        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{product.description}</p>
      ) : null}
      {product.brand ? <p className="text-[11px] text-slate-600 truncate mt-0.5">{product.brand}</p> : null}
      <p className="text-lg font-bold tabular-nums text-slate-900 mt-2">
        {formatCurrency(product.salePriceUsd)}
      </p>
      {product.salePriceVes != null && (
        <p className="text-xs tabular-nums text-indigo-600 font-medium">
          {formatCurrency(product.salePriceVes, 'VES')}
        </p>
      )}
      <p
        className={`text-[11px] mt-1 font-medium ${
          product.stock > 5 ? 'text-slate-400' : 'text-amber-600'
        }`}
      >
        Stock: {product.stock}
      </p>
    </>
  );
}
