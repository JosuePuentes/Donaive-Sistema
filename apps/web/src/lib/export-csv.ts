export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))];
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function printReportHtml(title: string, tableHtml: string) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`
    <!DOCTYPE html><html><head><title>${title}</title>
    <style>
      body{font-family:system-ui,sans-serif;padding:24px;color:#111}
      h1{font-size:18px;margin-bottom:8px}
      p{font-size:12px;color:#666;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;font-size:11px}
      th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
      th{background:#f4f4f5}
    </style></head><body>
    <h1>${title}</h1>
    <p>Generado: ${new Date().toLocaleString('es-VE')}</p>
    ${tableHtml}
    <script>window.onload=function(){window.print()}</script>
    </body></html>
  `);
  w.document.close();
}
