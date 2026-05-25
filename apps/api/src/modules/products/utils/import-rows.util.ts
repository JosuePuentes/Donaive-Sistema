import { ImportProductRowDto } from '../dto/import-products.dto';

export function normalizeImportSku(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number.isInteger(value) ? String(value) : String(value);
  }
  return String(value).trim();
}

/** Una fila por código: suma stock y conserva últimos costo/utilidad/descripción */
export function mergeImportRows(rows: ImportProductRowDto[]): ImportProductRowDto[] {
  const map = new Map<string, ImportProductRowDto>();

  for (const row of rows) {
    const sku = normalizeImportSku(row.sku);
    if (!sku) continue;

    const prev = map.get(sku);
    if (prev) {
      prev.stock = (prev.stock ?? 0) + (row.stock ?? 0);
      prev.name = row.name;
      prev.brand = row.brand ?? prev.brand;
      prev.description = row.description ?? prev.description;
      prev.barcode = row.barcode ?? prev.barcode;
      prev.costUsd = row.costUsd;
      prev.marginPercent = row.marginPercent;
    } else {
      map.set(sku, { ...row, sku });
    }
  }

  return Array.from(map.values());
}
