/** Normaliza celdas de Excel/CSV: "30%", "$2,50", "Bs 100" → número */
export function parseImportNumber(value: unknown, fallback = 0): number {
  if (value == null || value === '') return fallback;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  let s = String(value).trim();
  if (!s) return fallback;

  s = s
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

  // Excel a veces guarda 30% como 0.3
  if (n > 0 && n < 1 && String(value).includes('%') === false) {
    return Math.round(n * 10000) / 100;
  }

  return n;
}
