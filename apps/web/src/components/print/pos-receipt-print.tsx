'use client';

import { useEffect, useState } from 'react';
import { Printer, X } from 'lucide-react';
import type { PrintTemplateConfig } from '@flp/shared';
import { printConfigApi } from '@/lib/print-config-api';
import { Button } from '@/components/ui/button';
import { TicketReceipt } from './ticket-receipt';
import type { PosSaleReceipt } from '@/types/pos-receipt';
import { DEFAULT_PRINT_CONFIG } from '@flp/shared';

interface PosReceiptPrintProps {
  open: boolean;
  receipt: PosSaleReceipt | null;
  onClose: () => void;
}

export function PosReceiptPrint({ open, receipt, onClose }: PosReceiptPrintProps) {
  const [config, setConfig] = useState<PrintTemplateConfig>(DEFAULT_PRINT_CONFIG);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoadingConfig(true);
    printConfigApi
      .get()
      .then(setConfig)
      .catch(() => setConfig(DEFAULT_PRINT_CONFIG))
      .finally(() => setLoadingConfig(false));
  }, [open]);

  if (!open || !receipt) return null;

  function handlePrint() {
    window.print();
  }

  const ticketData = {
    number: receipt.number,
    confirmedAt: receipt.confirmedAt,
    sessionNumber: receipt.sessionNumber,
    cashierName: receipt.cashierName,
    tasaBcvMomento: receipt.tasaBcvMomento,
    totalUsd: receipt.totalUsd,
    totalVes: receipt.totalVes,
    lines: receipt.lines,
    payments: receipt.payments,
    change: receipt.change,
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/40 print:hidden">
        <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Ticket de venta</h2>
              <p className="text-sm text-slate-500">{receipt.number}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-5 bg-slate-50 max-h-[50vh] overflow-y-auto">
            {loadingConfig ? (
              <p className="text-center text-sm text-slate-500 py-8">Cargando formato...</p>
            ) : (
              <TicketReceipt config={config} data={ticketData} mode="preview" />
            )}
          </div>
          <div className="flex gap-3 p-4 border-t border-slate-100">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              Cerrar
            </Button>
            <Button type="button" className="flex-1" onClick={handlePrint} disabled={loadingConfig}>
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </div>
      </div>

      <div className="hidden print:block fixed left-0 top-0">
        <TicketReceipt id="pos-receipt-print" config={config} data={ticketData} mode="print" />
      </div>
    </>
  );
}
