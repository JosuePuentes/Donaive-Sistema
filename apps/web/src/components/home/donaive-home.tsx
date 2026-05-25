'use client';

import Link from 'next/link';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Receipt,
  Landmark,
  Settings2,
  Sparkles,
} from 'lucide-react';

const modules = [
  { href: '/dashboard', label: 'Informes', desc: 'KPIs y reportes', icon: LayoutDashboard },
  { href: '/pos', label: 'Punto de venta', desc: 'Caja y facturación', icon: ShoppingCart },
  { href: '/inventory/products', label: 'Inventario', desc: 'Productos y kardex', icon: Package },
  { href: '/admin/compras', label: 'Compras', desc: 'Órdenes y CxP', icon: Truck },
  { href: '/sales', label: 'Ventas', desc: 'Historial', icon: Receipt },
  { href: '/banks', label: 'Bancos', desc: 'Métodos de pago', icon: Landmark },
  { href: '/settings/tasa-bcv', label: 'Configuración', desc: 'Tasa BCV e impresión', icon: Settings2 },
];

export function DonaiveHome() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030712] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-indigo-600/25 blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-cyan-500/15 blur-[100px]" />
        <div className="absolute top-1/3 left-0 h-72 w-72 rounded-full bg-violet-600/20 blur-[90px]" />
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(99,102,241,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.4) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-16">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-3xl bg-indigo-500/40 blur-2xl animate-pulse" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-indigo-400/40 bg-indigo-950/80 shadow-[0_0_60px_rgba(99,102,241,0.45)] backdrop-blur-xl">
              <Sparkles className="h-10 w-10 text-cyan-300" />
            </div>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-400/90">
            Ferretería Los Puentes
          </p>
          <h1 className="mt-3 bg-gradient-to-r from-white via-indigo-200 to-cyan-300 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl md:text-6xl">
            Donaive
          </h1>
          <p className="mt-2 text-lg font-medium text-indigo-200/90 sm:text-xl">
            Sistema Administrativo
          </p>
          <p className="mt-4 max-w-md text-sm text-slate-400">
            Panel unificado de inventario, ventas, compras y caja. Seleccione un módulo para continuar.
          </p>
        </div>

        <div className="grid w-full max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.href}
                href={mod.href}
                className="group relative flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md transition-all duration-300 hover:border-cyan-400/40 hover:bg-white/10 hover:shadow-[0_0_30px_rgba(34,211,238,0.15)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/30 text-cyan-300 transition-transform duration-300 group-hover:scale-110 group-hover:bg-indigo-500/40">
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-sm font-semibold text-white">{mod.label}</span>
                <span className="text-center text-[10px] text-slate-500">{mod.desc}</span>
              </Link>
            );
          })}
        </div>

        <Link
          href="/login"
          className="mt-12 text-sm text-slate-500 transition-colors hover:text-cyan-300"
        >
          Cerrar sesión / Cambiar usuario
        </Link>
      </div>
    </main>
  );
}
