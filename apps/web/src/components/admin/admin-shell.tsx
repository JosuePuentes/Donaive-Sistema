'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Landmark,
  Receipt,
  History,
  Store,
  Settings2,
  Printer,
  ClipboardList,
  BarChart3,
  Users,
  UserCircle,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { BcvRateBadge } from './bcv-rate-badge';
import { clearAuthToken } from '@/lib/api-client';

const navGroups = [
  {
    label: 'Resumen',
    items: [
      { href: '/dashboard', label: 'Informes', icon: LayoutDashboard },
      { href: '/sales', label: 'Ventas', icon: Receipt },
      { href: '/admin/clientes', label: 'Clientes', icon: UserCircle },
      { href: '/admin/pagos', label: 'Historial pagos', icon: History },
    ],
  },
  {
    label: 'Inventario',
    items: [
      { href: '/inventory/products', label: 'Productos', icon: Package },
      { href: '/inventory/kardex', label: 'Kardex', icon: BarChart3 },
      { href: '/inventory/adjustments', label: 'Ajustes', icon: ClipboardList },
    ],
  },
  {
    label: 'Compras',
    items: [
      { href: '/admin/compras', label: 'Compras', icon: Truck },
      { href: '/admin/compras/cxp', label: 'CxP', icon: Landmark },
      { href: '/admin/proveedores', label: 'Proveedores', icon: Store },
    ],
  },
  {
    label: 'Finanzas',
    items: [
      { href: '/banks', label: 'Bancos', icon: Landmark },
      { href: '/settings/tasa-bcv', label: 'Tasa BCV', icon: Settings2 },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/admin/usuarios', label: 'Usuarios', icon: Users },
      { href: '/admin/configuracion/impresion', label: 'Impresión tickets', icon: Printer },
    ],
  },
];

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
        active
          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-white' : 'text-slate-400')} />
      {label}
    </Link>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href);

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="hidden lg:flex w-64 flex-col border-r border-slate-200/80 bg-white shrink-0">
        <div className="p-5 border-b border-slate-100">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-sm shadow-indigo-600/30 transition-transform duration-200 group-hover:scale-105">
              D
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm leading-tight">Donaive</p>
              <p className="text-xs text-slate-500">Ferretería Los Puentes</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.href}
                    {...item}
                    active={isActive(item.href)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-2">
          <Link
            href="/pos"
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-slate-900 text-white py-3 text-sm font-semibold transition-all duration-200 hover:bg-slate-800 shadow-sm"
          >
            <ShoppingCart className="h-4 w-4" />
            Abrir POS
          </Link>
          <button
            type="button"
            onClick={() => {
              clearAuthToken();
              window.location.href = '/login';
            }}
            className="flex items-center gap-2 w-full rounded-lg px-3 py-2.5 text-sm text-slate-500 hover:bg-rose-50 hover:text-rose-700 transition-all duration-200"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 py-4">
            <div className="lg:hidden flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                D
              </div>
              <span className="font-semibold text-slate-900 text-sm">Donaive</span>
            </div>

            <div className="flex-1 flex justify-center pointer-events-none">
              <div className="hidden lg:flex flex-col items-center">
                <span className="text-lg font-bold tracking-tight text-indigo-700">Donaive</span>
                <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">
                  Ferretería Los Puentes
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 ml-auto shrink-0">
              <BcvRateBadge variant="navbar" />
              <Link
                href="/pos"
                className="lg:hidden inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-indigo-700"
              >
                <ShoppingCart className="h-4 w-4" />
                POS
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
