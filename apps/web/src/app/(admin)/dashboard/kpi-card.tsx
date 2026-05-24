import { Card, CardContent } from '@/components/ui/card';
import { MoneyDisplay } from '@/components/ui/money-display';
import { cn } from '@/lib/cn';
import type { LucideIcon } from 'lucide-react';

type Accent = 'default' | 'green' | 'amber' | 'red';

const accentStyles: Record<Accent, string> = {
  default: 'border-slate-100',
  green: 'border-emerald-100 bg-gradient-to-br from-white to-emerald-50/40',
  amber: 'border-amber-100 bg-gradient-to-br from-white to-amber-50/40',
  red: 'border-rose-100 bg-gradient-to-br from-white to-rose-50/40',
};

const iconStyles: Record<Accent, string> = {
  default: 'bg-indigo-50 text-indigo-600',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-rose-50 text-rose-600',
};

export function KpiCard({
  title,
  usd,
  ves,
  subtitle,
  accent = 'default',
  icon: Icon,
  valueText,
}: {
  title: string;
  usd?: number;
  ves?: number;
  subtitle?: string;
  accent?: Accent;
  icon?: LucideIcon;
  /** Para KPIs no monetarios (ej. cantidad) */
  valueText?: string;
}) {
  return (
    <Card className={cn('overflow-hidden transition-shadow duration-200 hover:shadow-md', accentStyles[accent])}>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
            <div className="mt-3">
              {valueText !== undefined ? (
                <p className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                  {valueText}
                </p>
              ) : usd !== undefined ? (
                <MoneyDisplay usd={usd} ves={ves} size="md" />
              ) : null}
            </div>
            {subtitle ? (
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">{subtitle}</p>
            ) : null}
          </div>
          {Icon ? (
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', iconStyles[accent])}>
              <Icon className="h-5 w-5" />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
