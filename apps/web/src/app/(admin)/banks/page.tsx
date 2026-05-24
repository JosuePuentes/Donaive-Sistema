'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';

export default function BanksPage() {
  const [banks, setBanks] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [methods, setMethods] = useState<Array<{ id: string; name: string; currency: string }>>([]);

  useEffect(() => {
    apiFetch<typeof banks>('/banks').then(setBanks).catch(() => {});
    apiFetch<typeof methods>('/payment-methods').then(setMethods).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Bancos y Métodos de Pago</h1>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="border border-[var(--border)] rounded-xl p-4">
          <h2 className="font-semibold mb-3">Bancos</h2>
          {banks.map((b) => (
            <p key={b.id} className="text-sm py-1">{b.code} — {b.name}</p>
          ))}
          {banks.length === 0 && <p className="text-zinc-500 text-sm">Sin bancos</p>}
        </div>
        <div className="border border-[var(--border)] rounded-xl p-4">
          <h2 className="font-semibold mb-3">Métodos de pago</h2>
          {methods.map((m) => (
            <p key={m.id} className="text-sm py-1">{m.name} ({m.currency})</p>
          ))}
        </div>
      </div>
    </div>
  );
}
