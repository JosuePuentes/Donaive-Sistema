import { cn } from '@/lib/cn';

type AlertVariant = 'success' | 'warning' | 'danger' | 'info';

const styles: Record<AlertVariant, string> = {
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  danger: 'bg-rose-50 text-rose-800 border-rose-200',
  info: 'bg-indigo-50 text-indigo-800 border-indigo-200',
};

export function Alert({
  variant = 'info',
  className,
  children,
}: {
  variant?: AlertVariant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-3 text-sm leading-relaxed',
        styles[variant],
        className,
      )}
      role="alert"
    >
      {children}
    </div>
  );
}
