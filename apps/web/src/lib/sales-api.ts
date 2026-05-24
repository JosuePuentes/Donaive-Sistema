import { apiFetch } from './api-client';

export interface SalePayment {
  id: string;
  amount: number;
  currency: string;
  amountUsd: number;
  reference: string | null;
  paidAt: string;
  paymentMethod: { code: string; name: string };
}

export interface SaleLine {
  id: string;
  quantity: number;
  unitPriceUsd: number;
  totalUsd: number;
  product: { sku: string; name: string };
}

export interface Sale {
  id: string;
  number: string;
  documentType: string;
  status: string;
  totalUsd: number;
  totalVes: number;
  tasaBcvMomento: number;
  confirmedAt: string | null;
  createdAt: string;
  customer?: {
    firstName: string | null;
    lastName: string | null;
    businessName: string | null;
  } | null;
  cashRegisterSession?: { sessionNumber: string } | null;
  details: SaleLine[];
  payments: SalePayment[];
}

export interface DocumentPaymentHistory {
  id: string;
  amount: number;
  currency: string;
  amountUsd: number;
  reference: string | null;
  paidAt: string;
  paymentMethod: { name: string; code: string; type: string };
  bankAccount?: { accountName: string; currency: string } | null;
  invoice?: { id: string; number: string; documentType: string; totalUsd: number } | null;
  purchase?: {
    id: string;
    number: string;
    supplierInvoiceNumber: string;
    supplier?: { businessName: string };
  } | null;
}

export interface SupplierAbonoHistory {
  id: string;
  amountPaid: number;
  currency: string;
  amountAppliedUsd: number;
  amountAppliedVes: number;
  tasaBcvAbono: number;
  paidAt: string;
  reference: string | null;
  paymentMethod: { name: string; code: string };
  bankAccount: { accountName: string; currency: string };
  createdBy?: { firstName: string; lastName: string } | null;
  accountPayable: {
    purchase: {
      number: string;
      supplierInvoiceNumber: string;
      supplier: { businessName: string };
    };
  };
}

export const salesApi = {
  list: () => apiFetch<Sale[]>('/sales'),
};

export const paymentsApi = {
  history: (type?: 'sales' | 'purchases', limit = 100) =>
    apiFetch<DocumentPaymentHistory[]>(
      `/payments/history?limit=${limit}${type ? `&type=${type}` : ''}`,
    ),
  supplierAbonos: (limit = 100) =>
    apiFetch<SupplierAbonoHistory[]>(`/payments/supplier-abonos?limit=${limit}`),
};
