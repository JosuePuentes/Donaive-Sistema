import * as XLSX from 'xlsx';

export interface ProductImportRow {
  sku: string;
  barcode?: string;
  name: string;
  brand?: string;
  description?: string;
  costUsd: number;
  marginPercent: number;
  stock?: number;
}

/**
 * Acepta números de Excel y texto con formato VE/US:
 * 2.50 | 2,50 | 1.500 | 1.500,50 | 30% | $10
 */
export function parseNumericCell(value: unknown, fallback = 0): number {
  if (value == null || value === '') return fallback;
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  const raw = String(value).trim();
  if (!raw) return fallback;

  const hadPercent = raw.includes('%');
  let s = raw
    .replace(/%/g, '')
    .replace(/\$/g, '')
    .replace(/usd/gi, '')
    .replace(/bs\.?/gi, '')
    .replace(/\s/g, '');

  // Latino: 1.234,56 o 1.500,50 (punto miles, coma decimal)
  const latino = s.match(/^(\d{1,3}(?:\.\d{3})*)(?:,(\d+))?$/);
  if (latino) {
    const entero = latino[1].replace(/\./g, '');
    const dec = latino[2];
    const n = dec ? parseFloat(`${entero}.${dec}`) : parseFloat(entero);
    if (Number.isFinite(n)) return applyPercentScale(n, hadPercent);
  }

  // Solo coma decimal: 2,50
  if (/^\d+,\d+$/.test(s)) {
    const n = parseFloat(s.replace(',', '.'));
    if (Number.isFinite(n)) return applyPercentScale(n, hadPercent);
  }

  // Punto como miles sin decimales: 1.500 → 1500
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    const n = parseFloat(s.replace(/\./g, ''));
    if (Number.isFinite(n)) return applyPercentScale(n, hadPercent);
  }

  // Punto decimal US: 2.50 o 10.5
  if (/^\d+\.\d+$/.test(s)) {
    const n = parseFloat(s);
    if (Number.isFinite(n)) return applyPercentScale(n, hadPercent);
  }

  const n = parseFloat(s.replace(/,/g, ''));
  if (!Number.isFinite(n)) return fallback;
  return applyPercentScale(n, hadPercent);
}

function applyPercentScale(n: number, hadPercent: boolean): number {
  if (!hadPercent && n > 0 && n < 1) {
    return Math.round(n * 10000) / 100;
  }
  return n;
}

function headerIndex(headers: string[], names: string[]): number {
  const lower = headers.map((h) => h.toLowerCase().trim());
  return lower.findIndex((h) => names.some((n) => h.includes(n)));
}

function rowFromColumns(cols: string[], header: string[]): ProductImportRow | null {
  const iSku = headerIndex(header, ['codigo', 'código', 'sku', 'code']);
  const iName = headerIndex(header, ['descripcion', 'descripción', 'nombre', 'name']);
  const iBrand = headerIndex(header, ['marca', 'brand']);
  const iBarcode = headerIndex(header, ['barra', 'barcode', 'ean']);
  const iCost = headerIndex(header, ['costo', 'cost', 'precio costo']);
  const iMargin = headerIndex(header, ['utilidad', 'margen', 'margin', 'ganancia']);
  const iStock = headerIndex(header, ['stock', 'cantidad', 'qty', 'existencia']);

  const sku = (cols[iSku >= 0 ? iSku : 0] ?? '').trim();
  const name = (cols[iName >= 0 ? iName : 1] ?? sku).trim();
  if (!sku || !name) return null;

  const costUsd = parseNumericCell(cols[iCost >= 0 ? iCost : 3], 0);
  let marginPercent = parseNumericCell(cols[iMargin >= 0 ? iMargin : 4], 30);
  if (marginPercent > 0 && marginPercent <= 1 && !String(cols[iMargin >= 0 ? iMargin : 4] ?? '').includes('%')) {
    marginPercent = marginPercent * 100;
  }

  return {
    sku: sku.slice(0, 50),
    barcode: iBarcode >= 0 ? cols[iBarcode]?.trim() || undefined : undefined,
    name: name.slice(0, 200),
    brand: iBrand >= 0 ? cols[iBrand]?.trim() || undefined : undefined,
    costUsd,
    marginPercent,
    stock: parseNumericCell(cols[iStock >= 0 ? iStock : 5], 0),
  };
}

function normalizeHeaderKey(key: string): string {
  return key.toLowerCase().trim();
}

function rowFromObject(obj: Record<string, unknown>): ProductImportRow | null {
  const entries = Object.entries(obj).map(([k, v]) => [normalizeHeaderKey(k), v] as const);
  const get = (names: string[]) => {
    const entry = entries.find(([k]) => names.some((n) => k.includes(n)));
    return entry?.[1];
  };

  const sku = String(get(['codigo', 'código', 'sku', 'code']) ?? '').trim();
  const name = String(get(['descripcion', 'descripción', 'nombre', 'name']) ?? sku).trim();
  if (!sku || !name) return null;

  const marginRaw = get(['utilidad', 'margen', 'margin', 'ganancia']);
  let marginPercent = parseNumericCell(marginRaw, 30);
  if (
    marginPercent > 0 &&
    marginPercent <= 1 &&
    !String(marginRaw ?? '').includes('%')
  ) {
    marginPercent = marginPercent * 100;
  }

  return {
    sku: sku.slice(0, 50),
    barcode: String(get(['barra', 'barcode', 'ean']) ?? '').trim() || undefined,
    name: name.slice(0, 200),
    brand: String(get(['marca', 'brand']) ?? '').trim() || undefined,
    description: String(get(['detalle', 'description']) ?? '').trim() || undefined,
    costUsd: parseNumericCell(get(['costo', 'cost', 'precio costo']), 0),
    marginPercent,
    stock: parseNumericCell(get(['stock', 'cantidad', 'qty', 'existencia']), 0),
  };
}

export function parseCsvProductImport(text: string): ProductImportRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const firstLine = lines[0].replace(/^\uFEFF/, '');
  const sep = firstLine.includes(';') ? ';' : ',';
  const header = firstLine.split(sep).map((h) => h.trim().replace(/^"|"$/g, ''));

  return lines
    .slice(1)
    .map((line) => {
      const cols = line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ''));
      return rowFromColumns(cols, header);
    })
    .filter((r): r is ProductImportRow => r != null);
}

export async function parseProductImportFile(file: File): Promise<ProductImportRow[]> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return [];

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: true,
    });

    return rows.map(rowFromObject).filter((r): r is ProductImportRow => r != null);
  }

  const text = await file.text();
  return parseCsvProductImport(text);
}
