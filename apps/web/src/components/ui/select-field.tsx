import { cn } from '@/lib/cn';

export function SelectField({
  label,
  value,
  onChange,
  children,
  className,
}: {
  label: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('flex flex-col gap-1.5 text-sm text-slate-600', className)}>
      <span className="font-medium text-slate-700">{label}</span>
      <select
        value={value}
        onChange={onChange}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      >
        {children}
      </select>
    </label>
  );
}
