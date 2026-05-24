import Link from 'next/link';

const modules = [
  { href: '/dashboard', label: 'Informes', icon: '📊' },
  { href: '/pos', label: 'Punto de Venta', icon: '🛒' },
  { href: '/inventory/products', label: 'Inventario', icon: '📦' },
  { href: '/admin/compras', label: 'Compras', icon: '🚚' },
  { href: '/sales', label: 'Ventas', icon: '🧾' },
  { href: '/banks', label: 'Bancos', icon: '🏦' },
  { href: '/settings/tasa-bcv', label: 'Configuración', icon: '⚙️' },
];

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <header className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Ferretería Los Puentes
        </h1>
        <p className="mt-2 text-lg text-zinc-500">
          Sistema Administrativo y Punto de Venta
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 max-w-4xl w-full">
        {modules.map((mod) => (
          <Link
            key={mod.href}
            href={mod.href}
            className="flex flex-col items-center gap-2 p-6 rounded-xl border border-[var(--border)] bg-[var(--muted)] hover:border-[var(--primary)] transition-colors"
          >
            <span className="text-3xl">{mod.icon}</span>
            <span className="text-sm font-medium text-center">{mod.label}</span>
          </Link>
        ))}
      </div>

      <Link href="/login" className="text-sm text-zinc-500 hover:underline">
        Iniciar sesión
      </Link>
    </main>
  );
}
