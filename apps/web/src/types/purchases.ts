export interface Supplier {
  id: string;
  rif: string;
  businessName: string;
  tradeName?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  contactName?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseDetail {
  id: string;
  productId: string;
  quantity: number;
  unitCostUsd: number;
  marginPercent: number;
  totalUsd: number;
  totalVes: number;
  product?: { id: string; sku: string; name: string; unit?: string };
}

export interface Purchase {
  id: string;
  number: string;
  supplierId: string;
  status: string;
  purchaseDate: string;
  supplierInvoiceNumber: string;
  supplierControlNumber: string;
  tasaBcvMomento: number;
  subtotalUsd: number;
  taxUsd: number;
  totalUsd: number;
  subtotalVes: number;
  taxVes: number;
  totalVes: number;
  isCredit: boolean;
  dueDate?: string | null;
  notes?: string | null;
  confirmedAt?: string | null;
  createdAt: string;
  supplier?: Pick<Supplier, 'id' | 'businessName' | 'rif'>;
  details?: PurchaseDetail[];
  accountPayable?: {
    id: string;
    status: string;
    dueDate: string;
    balanceUsd: number;
  } | null;
}

export interface BankAccount {
  id: string;
  accountNumber: string;
  accountName: string;
  accountType: string;
  currency: string;
  isActive: boolean;
}

export interface CreateSupplierInput {
  rif: string;
  businessName: string;
  tradeName?: string;
  address?: string;
  phone?: string;
  email?: string;
  contactName?: string;
}

export interface PurchaseLineInput {
  productId: string;
  quantity: number;
  unitCostUsd: number;
  marginPercent?: number;
}

export interface CreatePurchaseInput {
  supplierId: string;
  purchaseDate: string;
  supplierInvoiceNumber: string;
  supplierControlNumber: string;
  lines: PurchaseLineInput[];
  tasaBcvMomento?: number;
  taxPercent?: number;
  isCredit?: boolean;
  dueDate?: string;
  bankAccountId?: string;
  notes?: string;
}

export interface CxpResumen {
  totalPorPagarUsd: number;
  totalPorPagarVes: number;
  cantidadDeudas: number;
  cantidadVencidas: number;
}

export interface CxpPendiente {
  id: string;
  status: string;
  vencida: boolean;
  diasRetraso: number;
  tasaBcvMomento: number;
  totalUsd: number;
  totalVes: number;
  saldoPendienteUsd: number;
  saldoPendienteVes: number;
  dueDate: string;
  supplier: { id: string; businessName: string; rif: string };
  purchase: {
    id: string;
    number: string;
    purchaseDate: string;
    supplierInvoiceNumber: string;
    supplierControlNumber: string;
    totalUsd: number;
    totalVes: number;
  };
  pagosRecientes: Array<{
    id: string;
    montoAbonadoUsd: number;
    montoAbonadoVes: number;
    montoPagado: number;
    moneda: string;
    tasaBcvAbono: number;
    fecha: string;
  }>;
}

export interface CxpAbonoLineInput {
  accountPayableId: string;
  amount: number;
  currency: 'USD' | 'VES';
}

export interface CxpAbonoInput {
  bankAccountId: string;
  lineas: CxpAbonoLineInput[];
  notes?: string;
}
