/** Normaliza celdas Excel/CSV (VE: 1.500,50 | 2,50 | US: 2.50) */
export function parseImportNumber(value: unknown, fallback = 0): number {
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

  const latino = s.match(/^(\d{1,3}(?:\.\d{3})*)(?:,(\d+))?$/);
  if (latino) {
    const entero = latino[1].replace(/\./g, '');
    const dec = latino[2];
    const n = dec ? parseFloat(`${entero}.${dec}`) : parseFloat(entero);
    if (Number.isFinite(n)) return scalePercent(n, hadPercent);
  }

  if (/^\d+,\d+$/.test(s)) {
    const n = parseFloat(s.replace(',', '.'));
    if (Number.isFinite(n)) return scalePercent(n, hadPercent);
  }

  if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    const n = parseFloat(s.replace(/\./g, ''));
    if (Number.isFinite(n)) return scalePercent(n, hadPercent);
  }

  if (/^\d+\.\d+$/.test(s)) {
    const n = parseFloat(s);
    if (Number.isFinite(n)) return scalePercent(n, hadPercent);
  }

  const n = parseFloat(s.replace(/,/g, ''));
  if (!Number.isFinite(n)) return fallback;
  return scalePercent(n, hadPercent);
}

function scalePercent(n: number, hadPercent: boolean): number {
  if (!hadPercent && n > 0 && n < 1) return Math.round(n * 10000) / 100;
  return n;
}
