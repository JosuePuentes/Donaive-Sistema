import type { PaperType } from '@flp/shared';

/** Ancho máximo del ticket en pantalla (preview) y referencia para @media print */
export function paperPreviewClass(tipoPapel: PaperType): string {
  switch (tipoPapel) {
    case 'TICKET_58MM':
      return 'max-w-[220px]';
    case 'CARTA':
      return 'max-w-[480px]';
    case 'TICKET_80MM':
    default:
      return 'max-w-[300px]';
  }
}

export function paperPrintClass(tipoPapel: PaperType): string {
  switch (tipoPapel) {
    case 'TICKET_58MM':
      return 'print-ticket-58';
    case 'CARTA':
      return 'print-carta';
    case 'TICKET_80MM':
    default:
      return 'print-ticket-80';
  }
}

export const PAPER_TYPE_LABELS: Record<PaperType, string> = {
  TICKET_80MM: 'Ticket 80 mm (estándar)',
  TICKET_58MM: 'Ticket 58 mm (compacto)',
  CARTA: 'Carta / A4',
};
