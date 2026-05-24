import { BASE_CURRENCY, TRANSACTION_CURRENCY } from '@flp/shared';

export function formatCurrency(
  amount: number,
  currency: 'USD' | 'VES' = BASE_CURRENCY,
): string {
  const locale = currency === BASE_CURRENCY ? 'en-US' : 'es-VE';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === TRANSACTION_CURRENCY ? 2 : 4,
    maximumFractionDigits: currency === TRANSACTION_CURRENCY ? 2 : 4,
  }).format(amount);
}
