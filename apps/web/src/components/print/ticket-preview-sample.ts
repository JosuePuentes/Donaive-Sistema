import type { TicketReceiptData } from './ticket-receipt';

/** Datos de ejemplo para la vista previa en configuración */
export const SAMPLE_TICKET_RECEIPT: TicketReceiptData = {
  number: 'POS-20260524-0001',
  confirmedAt: new Date().toISOString(),
  sessionNumber: 'CAJA-20260524-01',
  cashierName: 'María González',
  tasaBcvMomento: 72.5,
  totalUsd: 45.5,
  totalVes: 3298.75,
  lines: [
    {
      sku: 'TOR-001',
      name: 'Tornillo 1/2" x 2"',
      quantity: 10,
      unitPriceUsd: 0.25,
      unitPriceVes: 18.13,
      totalUsd: 2.5,
      totalVes: 181.25,
    },
    {
      sku: 'PIN-020',
      name: 'Pintura blanca 1 gal',
      quantity: 2,
      unitPriceUsd: 21.5,
      unitPriceVes: 1558.75,
      totalUsd: 43,
      totalVes: 3117.5,
    },
  ],
  payments: [
    { name: 'Efectivo USD', amount: 20, currency: 'USD' },
    { name: 'Pago móvil Bs', amount: 1858.75, currency: 'VES' },
  ],
  change: { paymentMethodId: '', currency: 'USD', amount: 5 },
};
