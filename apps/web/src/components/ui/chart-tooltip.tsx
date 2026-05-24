import { formatCurrency } from '@/lib/format-currency';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-lg shadow-slate-200/50">
      {label ? <p className="text-xs font-medium text-slate-500 mb-2">{label}</p> : null}
      <ul className="space-y-1.5">
        {payload.map(
          (entry: { name?: string; value?: number; color?: string }, i: number) => (
          <li key={i} className="flex items-center justify-between gap-6 text-sm">
            <span className="flex items-center gap-2 text-slate-600">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: entry.color ?? '#6366f1' }}
              />
              {entry.name}
            </span>
            <span className="font-semibold tabular-nums text-slate-900">
              {formatCurrency(Number(entry.value ?? 0))}
            </span>
          </li>
          ),
        )}
      </ul>
    </div>
  );
}
