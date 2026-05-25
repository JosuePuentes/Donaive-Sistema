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

/** Acepta "30", "30%", "$2.50", "2,50", etc. La utilidad es porcentaje (30 = 30%). */
export function parseNumericCell(value: unknown, fallback = 0): number {
  if (value == null || value === '') return fallback;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  const raw = String(value).trim();
  if (!raw) return fallback;

  const hadPercent = raw.includes('%');
  let s = raw
    .replace(/%/g, '')
    .replace(/\$/g, '')
    .replace(/usd/gi, '')
    .replace(/bs\.?/gi, '')
    .replace(/\s/g, '');

  if (s.includes(',') && s.includes('.')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }

  const n = parseFloat(s);
  if (!Number.isFinite(n)) return fallback;

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
  const iCost = headerIndex(header, ['costo', 'cost']);
  const iMargin = headerIndex(header, ['utilidad', 'margen', 'margin', 'ganancia']);
  const iStock = headerIndex(header, ['stock', 'cantidad', 'qty', 'existencia']);

  const sku = (cols[iSku >= 0 ? iSku : 0] ?? '').trim();
  const name = (cols[iName >= 0 ? iName : 1] ?? sku).trim();
  if (!sku || !name) return null;

  const costUsd = parseNumericCell(cols[iCost >= 0 ? iCost : 3], 0);
  let marginPercent = parseNumericCell(cols[iMargin >= 0 ? iMargin : 4], 30);
  if (marginPercent > 0 && marginPercent <= 1) {
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

function rowFromObject(obj: Record<string, unknown>): ProductImportRow | null {
  const keys = Object.keys(obj);
  const get = (names: string[]) => {
    const key = keys.find((k) => names.some((n) => k.toLowerCase().includes(n)));
    return key != null ? obj[key] : undefined;
  };

  const sku = String(get(['codigo', 'código', 'sku', 'code']) ?? '').trim();
  const name = String(get(['descripcion', 'descripción', 'nombre', 'name']) ?? sku).trim();
  if (!sku || !name) return null;

  let marginPercent = parseNumericCell(get(['utilidad', 'margen', 'margin', 'ganancia']), 30);
  if (marginPercent > 0 && marginPercent <= 1) {
    marginPercent = marginPercent * 100;
  }

  return {
    sku: sku.slice(0, 50),
    barcode: String(get(['barra', 'barcode', 'ean']) ?? '').trim() || undefined,
    name: name.slice(0, 200),
    brand: String(get(['marca', 'brand']) ?? '').trim() || undefined,
    description: String(get(['detalle', 'description']) ?? '').trim() || undefined,
    costUsd: parseNumericCell(get(['costo', 'cost']), 0),
    marginPercent,
    stock: parseNumericCell(get(['stock', 'cantidad', 'qty', 'existencia']), 0),
  };
}

export function parseCsvProductImport(text: string): ProductImportRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const sep = lines[0].includes(';') ? ';' : ',';
  const header = lines[0].replace(/^\uFEFF/, '').split(sep).map((h) => h.trim().replace(/^"|"$/g, ''));

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
      raw: false,
    });

    return rows.map(rowFromObject).filter((r): r is ProductImportRow => r != null);
  }

  const text = await file.text();
  return parseCsvProductImport(text);
}
