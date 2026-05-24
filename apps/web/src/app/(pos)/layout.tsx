import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Donaive — Punto de Venta',
  description: 'Caja registradora Donaive',
};

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">{children}</div>
  );
}
