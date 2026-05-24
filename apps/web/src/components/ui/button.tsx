import { cn } from '@/lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm border border-transparent focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
  secondary:
    'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent',
  danger:
    'bg-rose-600 text-white hover:bg-rose-700 shadow-sm border border-transparent focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2.5 text-sm font-medium rounded-lg',
  lg: 'px-5 py-3 text-base font-medium rounded-xl',
};

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
