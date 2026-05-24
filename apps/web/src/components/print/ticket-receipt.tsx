'use client';

import type { PrintTemplateConfig } from '@flp/shared';
import { formatCurrency } from '@/lib/format-currency';
import { cn } from '@/lib/cn';
import { paperPreviewClass, paperPrintClass } from '@/lib/print-utils';
import type { PosReceiptLine, PosReceiptPayment } from '@/types/pos-receipt';
import type { PosChangeInput } from '@flp/shared';

export interface TicketReceiptData {
  number: string;
  confirmedAt: string;
  sessionNumber?: string;
  cashierName?: string | null;
  tasaBcvMomento: number;
  totalUsd: number;
  totalVes: number;
  lines: PosReceiptLine[];
  payments: PosReceiptPayment[];
  change?: PosChangeInput | null;
}

interface TicketReceiptProps {
  config: PrintTemplateConfig;
  data: TicketReceiptData;
  /** Vista previa en admin (escala visual) vs impresión real */
  mode?: 'preview' | 'print';
  className?: string;
  id?: string;
}

export function TicketReceipt({
  config,
  data,
  mode = 'preview',
  className,
  id,
}: TicketReceiptProps) {
  const isPrint = mode === 'print';
  const widthClass = paperPreviewClass(config.tipoPapel);
  const printClass = paperPrintClass(config.tipoPapel);

  return (
    <div
      id={id}
      className={cn(
        'mx-auto font-mono text-[11px] leading-snug text-black bg-white',
        widthClass,
        isPrint && printClass,
        isPrint ? 'p-0' : 'p-4 border border-slate-200 rounded-lg shadow-inner',
        className,
      )}
    >
      {config.mostrarLogo && (
        <div className="text-center mb-2">
          <div
            className={cn(
              'inline-flex items-center justify-center rounded-md bg-slate-900 text-white font-bold',
              config.tipoPapel === 'TICKET_58MM' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm',
            )}
          >
            {config.nombreEmpresa.charAt(0).toUpperCase()}
          </div>
        </div>
      )}

      <div className="text-center border-b border-dashed border-slate-400 pb-2 mb-2">
        <p className="font-bold text-sm uppercase tracking-wide">{config.nombreEmpresa}</p>
        {config.rif ? <p className="mt-0.5">RIF: {config.rif}</p> : null}
        {config.direccion ? <p className="mt-0.5 whitespace-pre-line">{config.direccion}</p> : null}
        {config.telefono ? <p className="mt-0.5">Tel: {config.telefono}</p> : null}
        {config.mensajePersonalizado ? (
          <p className="mt-1 text-[10px] italic">{config.mensajePersonalizado}</p>
        ) : null}
      </div>

      <div className="space-y-0.5 mb-2 text-[10px]">
        <p>
          <span className="font-semibold">Factura:</span> {data.number}
        </p>
        <p>
          <span className="font-semibold">Fecha:</span>{' '}
          {new Date(data.confirmedAt).toLocaleString('es-VE')}
        </p>
        {data.sessionNumber ? (
          <p>
            <span className="font-semibold">Sesión:</span> {data.sessionNumber}
          </p>
        ) : null}
        {config.mostrarCajero && data.cashierName ? (
          <p>
            <span className="font-semibold">Cajero:</span> {data.cashierName}
          </p>
        ) : null}
        {config.mostrarTasaBcv ? (
          <p>
            <span className="font-semibold">Tasa BCV:</span>{' '}
            {data.tasaBcvMomento.toLocaleString('es-VE')} Bs/USD
          </p>
        ) : null}
      </div>

      <table className="w-full border-collapse mb-2 text-[10px]">
        <thead>
          <tr className="border-b border-slate-400">
            <th className="text-left py-1 font-semibold">Producto</th>
            <th className="text-center py-1 font-semibold w-8">Cant</th>
            <th className="text-right py-1 font-semibold">USD</th>
            {config.mostrarPreciosBs ? (
              <th className="text-right py-1 font-semibold pl-1">Bs</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {data.lines.map((line) => (
            <tr key={`${line.sku}-${line.name}`} className="border-b border-dashed border-slate-200">
              <td className="py-1 pr-1 align-top">
                <span className="block font-medium leading-tight">{line.name}</span>
                <span className="text-[9px] text-slate-600">{line.sku}</span>
              </td>
              <td className="text-center py-1 align-top tabular-nums">{line.quantity}</td>
              <td className="text-right py-1 align-top tabular-nums">
                {formatCurrency(line.totalUsd)}
              </td>
              {config.mostrarPreciosBs ? (
                <td className="text-right py-1 align-top tabular-nums pl-1">
                  {formatCurrency(line.totalVes, 'VES')}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-slate-400 pt-2 space-y-1 text-[11px]">
        <div className="flex justify-between font-bold">
          <span>TOTAL USD</span>
          <span className="tabular-nums">{formatCurrency(data.totalUsd)}</span>
        </div>
        {config.mostrarPreciosBs ? (
          <div className="flex justify-between font-bold">
            <span>TOTAL Bs</span>
            <span className="tabular-nums">{formatCurrency(data.totalVes, 'VES')}</span>
          </div>
        ) : null}
      </div>

      {data.payments.length > 0 && (
        <div className="mt-2 pt-2 border-t border-dashed border-slate-300 text-[10px] space-y-0.5">
          <p className="font-semibold uppercase text-[9px]">Pagos</p>
          {data.payments.map((p, i) => (
            <div key={i} className="flex justify-between gap-2">
              <span className="truncate">{p.name}</span>
              <span className="tabular-nums shrink-0">
                {formatCurrency(p.amount, p.currency)}
              </span>
            </div>
          ))}
        </div>
      )}

      {data.change && data.change.amount > 0 && (
        <div className="mt-2 p-1.5 border border-slate-400 text-center font-bold text-[11px]">
          VUELTO: {formatCurrency(data.change.amount, data.change.currency)}
        </div>
      )}

      {config.piePagina ? (
        <p className="mt-3 pt-2 border-t border-dashed border-slate-400 text-center text-[10px] whitespace-pre-line">
          {config.piePagina}
        </p>
      ) : null}
    </div>
  );
}
