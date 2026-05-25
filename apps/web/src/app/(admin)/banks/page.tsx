'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { formatCurrency } from '@/lib/format-currency';

interface Bank {
  id: string;
  code: string;
  name: string;
}

interface BankAccount {
  id: string;
  accountNumber: string;
  accountName: string;
  currency: string;
  balance?: number;
  bank: { id: string; code: string; name: string };
}

interface PaymentMethod {
  id: string;
  code: string;
  name: string;
  type: string;
  currency: string;
  balance: number;
  bankAccountId: string | null;
}

export default function BanksPage() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [bankForm, setBankForm] = useState({ code: '', name: '' });
  const [accountForm, setAccountForm] = useState({
    bankId: '',
    accountNumber: '',
    accountName: '',
    accountType: 'CHECKING',
    currency: 'USD',
  });
  const [methodForm, setMethodForm] = useState({
    code: '',
    name: '',
    type: 'CASH_USD',
    currency: 'USD',
    bankAccountId: '',
  });

  function load() {
    apiFetch<Bank[]>('/banks').then(setBanks).catch(() => {});
    apiFetch<BankAccount[]>('/bank-accounts').then(setAccounts).catch(() => {});
    apiFetch<PaymentMethod[]>('/payment-methods').then(setMethods).catch(() => {});
  }

  useEffect(() => {
    load();
  }, []);

  async function createBank(e: React.FormEvent) {
    e.preventDefault();
    await apiFetch('/banks', { method: 'POST', body: JSON.stringify(bankForm) });
    setBankForm({ code: '', name: '' });
    load();
  }

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    await apiFetch('/bank-accounts', { method: 'POST', body: JSON.stringify(accountForm) });
    setAccountForm({
      bankId: '',
      accountNumber: '',
      accountName: '',
      accountType: 'CHECKING',
      currency: 'USD',
    });
    load();
  }

  async function createMethod(e: React.FormEvent) {
    e.preventDefault();
    await apiFetch('/payment-methods', {
      method: 'POST',
      body: JSON.stringify({
        ...methodForm,
        bankAccountId: methodForm.bankAccountId || undefined,
      }),
    });
    setMethodForm({ code: '', name: '', type: 'CASH', currency: 'USD', bankAccountId: '' });
    load();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Bancos y métodos de pago</h1>
        <p className="text-sm text-zinc-500">
          Los métodos de pago configurados aquí aparecen en el POS al cobrar
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="border border-[var(--border)] rounded-xl p-4 space-y-4">
          <h2 className="font-semibold">Agregar banco</h2>
          <form onSubmit={createBank} className="space-y-2">
            <input
              placeholder="Código (ej. BNC)"
              value={bankForm.code}
              onChange={(e) => setBankForm({ ...bankForm, code: e.target.value })}
              required
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
            <input
              placeholder="Nombre del banco"
              value={bankForm.name}
              onChange={(e) => setBankForm({ ...bankForm, name: e.target.value })}
              required
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
            <button type="submit" className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">
              Crear banco
            </button>
          </form>
          <ul className="text-sm space-y-1 border-t pt-3">
            {banks.map((b) => (
              <li key={b.id}>
                {b.code} — {b.name}
              </li>
            ))}
          </ul>
        </section>

        <section className="border border-[var(--border)] rounded-xl p-4 space-y-4">
          <h2 className="font-semibold">Cuenta bancaria</h2>
          <form onSubmit={createAccount} className="space-y-2">
            <select
              value={accountForm.bankId}
              onChange={(e) => setAccountForm({ ...accountForm, bankId: e.target.value })}
              required
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">Seleccione banco</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} — {b.name}
                </option>
              ))}
            </select>
            <input
              placeholder="Nº cuenta"
              value={accountForm.accountNumber}
              onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value })}
              required
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
            <input
              placeholder="Nombre cuenta"
              value={accountForm.accountName}
              onChange={(e) => setAccountForm({ ...accountForm, accountName: e.target.value })}
              required
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
            <select
              value={accountForm.currency}
              onChange={(e) => setAccountForm({ ...accountForm, currency: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="USD">USD</option>
              <option value="VES">VES</option>
            </select>
            <button type="submit" className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">
              Crear cuenta
            </button>
          </form>
          <ul className="text-sm space-y-1 border-t pt-3 max-h-40 overflow-y-auto">
            {accounts.map((a) => (
              <li key={a.id} className="flex justify-between gap-2">
                <span>
                  {a.bank.code}: {a.accountName} ({a.currency})
                </span>
                <span className="font-mono font-medium tabular-nums">
                  {formatCurrency(Number(a.balance ?? 0), a.currency as 'USD' | 'VES')}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="border border-[var(--border)] rounded-xl p-4 space-y-4">
          <h2 className="font-semibold">Método de pago (POS)</h2>
          <form onSubmit={createMethod} className="space-y-2">
            <input
              placeholder="Código (ej. ZELLE)"
              value={methodForm.code}
              onChange={(e) => setMethodForm({ ...methodForm, code: e.target.value })}
              required
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
            <input
              placeholder="Nombre visible en POS"
              value={methodForm.name}
              onChange={(e) => setMethodForm({ ...methodForm, name: e.target.value })}
              required
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
            <select
              value={methodForm.type}
              onChange={(e) => setMethodForm({ ...methodForm, type: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="CASH_USD">Efectivo USD</option>
              <option value="CASH_VES">Efectivo Bs</option>
              <option value="MOBILE_PAYMENT">Pago móvil</option>
              <option value="DEBIT_CARD">Tarjeta débito</option>
              <option value="BANK_TRANSFER">Transferencia</option>
              <option value="ZELLE">Zelle</option>
              <option value="CREDIT">Crédito</option>
            </select>
            <select
              value={methodForm.currency}
              onChange={(e) => setMethodForm({ ...methodForm, currency: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="USD">USD</option>
              <option value="VES">VES</option>
            </select>
            <select
              value={methodForm.bankAccountId}
              onChange={(e) => setMethodForm({ ...methodForm, bankAccountId: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">Sin cuenta (opcional)</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.bank.code} — {a.accountName}
                </option>
              ))}
            </select>
            <button type="submit" className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">
              Crear método
            </button>
          </form>
          <ul className="text-sm space-y-1 border-t pt-3">
            {methods.map((m) => (
              <li key={m.id} className="flex justify-between gap-2">
                <span>
                  {m.name}{' '}
                  <span className="text-zinc-400">({m.code}, {m.currency})</span>
                </span>
                <span className="font-mono font-medium tabular-nums text-indigo-700">
                  {formatCurrency(Number(m.balance ?? 0), m.currency as 'USD' | 'VES')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
