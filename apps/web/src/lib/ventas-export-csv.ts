import { downloadCsv } from './export-csv';
import type { ExportRowsResponse } from './reports-api';

function rowsToMatrix(
  rows: Array<Record<string, string | number>>,
  headers: string[],
): (string | number)[][] {
  return rows.map((r) => headers.map((h) => r[h] ?? ''));
}

/** Genera un CSV con pagos, productos y resumen de totales por método. */
export function downloadVentasInformeCsv(data: ExportRowsResponse, filename: string) {
  const pagos = data.pagos ?? data.rows;
  const productos = data.productos ?? [];
  const resumenFilas = data.resumenFilas ?? [];

  const pagosHeaders = [
    'fecha',
    'hora',
    'factura',
    'cliente',
    'metodoPago',
    'codigoMetodo',
    'tipoMetodo',
    'moneda',
    'monto',
    'montoBs',
    'montoUsd',
    'referencia',
  ];

  const productosHeaders = [
    'fecha',
    'factura',
    'cliente',
    'codigo',
    'descripcion',
    'marca',
    'cantidad',
    'totalLineaUsd',
    'totalLineaBs',
  ];

  const resumenHeaders = ['concepto', 'montoBs', 'montoUsd'];

  const lines: string[] = [];
  const escape = (v: string | number) => {
    const s = String(v ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const pushSection = (title: string, headers: string[], matrix: (string | number)[][]) => {
    lines.push(escape(title));
    lines.push(headers.map(escape).join(','));
    matrix.forEach((row) => lines.push(row.map(escape).join(',')));
    lines.push('');
  };

  pushSection('DETALLE DE PAGOS POR METODO', pagosHeaders, rowsToMatrix(pagos, pagosHeaders));

  if (productos.length > 0) {
    pushSection(
      'DETALLE DE PRODUCTOS VENDIDOS',
      productosHeaders,
      rowsToMatrix(productos, productosHeaders),
    );
  }

  if (resumenFilas.length > 0) {
    pushSection(
      'RESUMEN TOTALES POR METODO DE PAGO',
      resumenHeaders,
      rowsToMatrix(resumenFilas, resumenHeaders),
    );
  }

  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ventasResumenHtml(data: ExportRowsResponse): string {
  const r = data.resumen;
  if (!r) return '';
  return `
    <table>
      <thead><tr><th>Concepto</th><th>Monto Bs</th><th>Monto USD</th></tr></thead>
      <tbody>
        <tr><td>Efectivo Bs</td><td>${r.totalBsEfectivo.toLocaleString('es-VE')}</td><td>—</td></tr>
        <tr><td>Débito Bs</td><td>${r.totalBsDebito.toLocaleString('es-VE')}</td><td>—</td></tr>
        <tr><td>Pago móvil Bs</td><td>${r.totalBsPagoMovil.toLocaleString('es-VE')}</td><td>—</td></tr>
        <tr><td>Transferencia Bs</td><td>${r.totalBsTransferencia.toLocaleString('es-VE')}</td><td>—</td></tr>
        <tr><td><strong>Total Bs</strong></td><td><strong>${r.totalBs.toLocaleString('es-VE')}</strong></td><td>—</td></tr>
        <tr><td>Efectivo USD</td><td>—</td><td>${r.totalUsdEfectivo.toLocaleString('es-VE')}</td></tr>
        <tr><td>Zelle USD</td><td>—</td><td>${r.totalUsdZelle.toLocaleString('es-VE')}</td></tr>
        <tr><td><strong>Total USD</strong></td><td>—</td><td><strong>${r.totalUsd.toLocaleString('es-VE')}</strong></td></tr>
      </tbody>
    </table>
  `;
}
