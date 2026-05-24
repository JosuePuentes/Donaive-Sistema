import { formatCurrency } from '@/lib/format-currency';
import { cn } from '@/lib/cn';

export function MoneyDisplay({
  usd,
  ves,
  size = 'md',
  className,
}: {
  usd: number;
  ves?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    sm: { main: 'text-lg font-semibold', sub: 'text-[10px]' },
    md: { main: 'text-2xl font-semibold tracking-tight', sub: 'text-xs' },
    lg: { main: 'text-3xl font-bold tracking-tight', sub: 'text-sm' },
  };

  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <span className={cn('text-slate-900 tabular-nums', sizeClasses[size].main)}>
        {formatCurrency(usd)}
      </span>
      {ves !== undefined ? (
        <span className={cn('text-slate-500 tabular-nums', sizeClasses[size].sub)}>
          {formatCurrency(ves, 'VES')}
        </span>
      ) : null}
    </div>
  );
}

export function MoneyInline({
  amount,
  currency = 'USD',
  className,
}: {
  amount: number;
  currency?: 'USD' | 'VES';
  className?: string;
}) {
  return (
    <span className={cn('font-semibold tabular-nums text-slate-900', className)}>
      {formatCurrency(amount, currency)}
    </span>
  );
}
