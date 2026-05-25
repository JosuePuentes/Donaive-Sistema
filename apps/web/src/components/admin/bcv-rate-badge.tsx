'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, Loader2 } from 'lucide-react';
import { tasaBcvApi } from '@/lib/tasa-bcv-api';
import { getCachedBcvRate } from '@/lib/tasa-bcv-cache';
import { cn } from '@/lib/cn';

export function BcvRateBadge({ variant = 'sidebar' }: { variant?: 'sidebar' | 'navbar' }) {
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCachedBcvRate(() => tasaBcvApi.getActual())
      .then(setRate)
      .finally(() => setLoading(false));
  }, []);

  if (variant === 'sidebar') {
    if (loading) return null;
    if (rate === null) return null;
    return (
      <Link
        href="/settings/tasa-bcv"
        className="mx-2 mb-3 block rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all duration-200"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Tasa BCV
        </span>
        <p className="font-semibold text-indigo-600 tabular-nums mt-0.5">
          1 USD = {rate.toLocaleString('es-VE')} Bs
        </p>
      </Link>
    );
  }

  return (
    <Link
      href="/settings/tasa-bcv"
      className={cn(
        'inline-flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-2.5 shadow-sm',
        'hover:border-indigo-200 hover:shadow-md transition-all duration-200',
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <TrendingUp className="h-4 w-4" />
        )}
      </div>
      <div className="text-left">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 leading-none">
          Tasa BCV oficial
        </p>
        <p className="text-sm font-semibold text-slate-900 tabular-nums mt-0.5">
          {rate !== null ? (
            <>
              <span className="text-indigo-600">1 USD</span>
              <span className="text-slate-400 mx-1">=</span>
              {rate.toLocaleString('es-VE')} Bs
            </>
          ) : (
            <span className="text-slate-400">No disponible</span>
          )}
        </p>
      </div>
    </Link>
  );
}
