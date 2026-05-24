export const PURCHASE_DRAFT_STORAGE_KEY = 'flp-purchase-draft-lines';

export interface PurchaseDraftLine {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  costUsd: number;
  marginPercent?: number;
}

export function savePurchaseDraft(lines: PurchaseDraftLine[]): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(PURCHASE_DRAFT_STORAGE_KEY, JSON.stringify(lines));
}

export function consumePurchaseDraft(): PurchaseDraftLine[] | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(PURCHASE_DRAFT_STORAGE_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(PURCHASE_DRAFT_STORAGE_KEY);
  try {
    const parsed = JSON.parse(raw) as PurchaseDraftLine[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
