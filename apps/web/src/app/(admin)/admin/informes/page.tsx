'use client';

import { useState } from 'react';
import { Download, FileText, Printer } from 'lucide-react';
import {
  fetchBancosExport,
  fetchClientesExport,
  fetchMovimientosExport,
  fetchPlanificacionExport,
  fetchVentasExport,
} from '@/lib/reports-export-fallback';
import { downloadCsv, printReportHtml } from '@/lib/export-csv';
import { downloadVentasInformeCsv, ventasResumenHtml } from '@/lib/ventas-export-csv';

type ReportId =
  | 'ventas'
  | 'clientes'
  | 'movimientos'
  | 'planificacion'
  | 'bancos';

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function rowsToTable(rows: Array<Record<string, string | number>>) {
  if (!rows.length) return '<p>Sin datos en el período</p>';
  const keys = Object.keys(rows[0]);
  const head = keys.map((k) => `<th>${k}</th>`).join('');
  const body = rows
    .map(
      (r) =>
        `<tr>${keys.map((k) => `<td>${r[k] ?? ''}</td>`).join('')}</tr>`,
    )
    .join('');
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

export default function InformesPage() {
  const [range, setRange] = useState(defaultRange);
  const [coverageDays, setCoverageDays] = useState(45);
  const [loading, setLoading] = useState<ReportId | null>(null);
  const [error, setError] = useState('');

  async function runExport(
    id: ReportId,
    format: 'csv' | 'pdf',
  ) {
    setLoading(id);
    setError('');
    try {
      if (id === 'ventas') {
        const data = await fetchVentasExport(range.from, range.to);
        if (format === 'csv') {
          downloadVentasInformeCsv(data, `ventas_${range.from}_${range.to}.csv`);
        } else {
          const pagosTable = rowsToTable(data.pagos ?? data.rows);
          const resumenTable = ventasResumenHtml(data);
          printReportHtml(
            `Ventas ${range.from} — ${range.to}`,
            `${resumenTable}<h2 style="margin-top:24px;font-size:14px">Detalle de pagos</h2>${pagosTable}`,
          );
        }
      } else if (id === 'clientes') {
        const data = await fetchClientesExport();
        const headers = ['rif', 'nombre', 'telefono', 'email', 'limiteCreditoUsd'];
        const rows = data.rows.map((r) => headers.map((h) => r[h] ?? ''));
        if (format === 'csv') downloadCsv('clientes.csv', headers, rows);
        else printReportHtml('Informe de clientes', rowsToTable(data.rows));
      } else if (id === 'movimientos') {
        const data = await fetchMovimientosExport(range.from, range.to);
        const headers = Object.keys(data.rows[0] ?? { fecha: '' });
        const rows = data.rows.map((r) => headers.map((h) => r[h] ?? ''));
        if (format === 'csv') {
          downloadCsv(`movimientos_${range.from}_${range.to}.csv`, headers, rows);
        } else {
          printReportHtml(`Movimientos ${range.from} — ${range.to}`, rowsToTable(data.rows));
        }
      } else if (id === 'planificacion') {
        const data = await fetchPlanificacionExport(coverageDays);
        const headers = Object.keys(data.rows[0] ?? { codigo: '' });
        const rows = data.rows.map((r) => headers.map((h) => r[h] ?? ''));
        if (format === 'csv') downloadCsv(`planificacion_compra_${coverageDays}d.csv`, headers, rows);
        else printReportHtml(`Planificación de compra (${coverageDays} días)`, rowsToTable(data.rows));
      } else if (id === 'bancos') {
        const data = await fetchBancosExport();
        const allRows: Array<Record<string, string | number>> = [
          ...data.bancos.map((r) => ({ tipo: 'Banco', ...r })),
          ...data.cuentas.map((r) => ({ tipo: 'Cuenta', ...r })),
          ...data.metodosPago.map((r) => ({ tipo: 'Método pago', ...r })),
        ];
        const headers = Object.keys(allRows[0] ?? { tipo: '' });
        const rows = allRows.map((r) => headers.map((h) => r[h] ?? ''));
        if (format === 'csv') downloadCsv('bancos_y_metodos.csv', headers, rows);
        else printReportHtml('Bancos y métodos de pago', rowsToTable(allRows));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar informe');
    } finally {
      setLoading(null);
    }
  }

  const cards: Array<{
    id: ReportId;
    title: string;
    desc: string;
    needsRange?: boolean;
    needsCoverage?: boolean;
  }> = [
    { id: 'ventas', title: 'Ventas general', desc: 'Detalle por factura, producto y cliente', needsRange: true },
    { id: 'clientes', title: 'Clientes', desc: 'Listado con teléfono y límite de crédito' },
    { id: 'movimientos', title: 'Movimientos de unidades', desc: 'Entradas, salidas y ajustes en kardex', needsRange: true },
    { id: 'planificacion', title: 'Planificación de compra', desc: 'Sugeridos según demanda y cobertura', needsCoverage: true },
    { id: 'bancos', title: 'Bancos y métodos de pago', desc: 'Cuentas, saldos y métodos del POS' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Informes</h1>
        <p className="text-sm text-zinc-500">
          Descargue reportes en Excel (CSV) o imprima en PDF. El tablero de KPIs está en{' '}
          <a href="/dashboard" className="text-indigo-600 underline">Tablero</a>.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 items-end p-4 rounded-xl border border-[var(--border)] bg-[var(--muted)]">
        <div>
          <label className="text-xs font-medium text-zinc-500">Desde</label>
          <input
            type="date"
            value={range.from}
            onChange={(e) => setRange({ ...range, from: e.target.value })}
            className="block mt-1 px-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-500">Hasta</label>
          <input
            type="date"
            value={range.to}
            onChange={(e) => setRange({ ...range, to: e.target.value })}
            className="block mt-1 px-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-500">Cobertura compra (días)</label>
          <select
            value={coverageDays}
            onChange={(e) => setCoverageDays(Number(e.target.value))}
            className="block mt-1 px-3 py-2 border rounded-lg text-sm"
          >
            <option value={15}>15</option>
            <option value={30}>30</option>
            <option value={45}>45</option>
            <option value={60}>60</option>
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

      <div className="grid md:grid-cols-2 gap-4">
        {cards.map((card) => (
          <div
            key={card.id}
            className="border border-[var(--border)] rounded-xl p-5 bg-white space-y-3"
          >
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <h2 className="font-semibold">{card.title}</h2>
                <p className="text-xs text-zinc-500 mt-0.5">{card.desc}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={loading === card.id}
                onClick={() => runExport(card.id, 'csv')}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Excel (CSV)
              </button>
              <button
                type="button"
                disabled={loading === card.id}
                onClick={() => runExport(card.id, 'pdf')}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-[var(--border)] hover:bg-zinc-50 disabled:opacity-50"
              >
                <Printer className="h-4 w-4" />
                PDF
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
