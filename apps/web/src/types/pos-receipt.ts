import type { CurrencyCode, PosChangeInput } from '@flp/shared';

export interface PosReceiptLine {
  sku: string;
  name: string;
  quantity: number;
  unitPriceUsd: number;
  unitPriceVes: number;
  totalUsd: number;
  totalVes: number;
}

export interface PosReceiptPayment {
  name: string;
  amount: number;
  currency: CurrencyCode;
}

export interface PosSaleReceipt {
  id: string;
  number: string;
  totalUsd: number;
  totalVes: number;
  tasaBcvMomento: number;
  sessionNumber?: string;
  confirmedAt: string;
  cashierName?: string | null;
  lines: PosReceiptLine[];
  payments: PosReceiptPayment[];
  change?: PosChangeInput | null;
}
