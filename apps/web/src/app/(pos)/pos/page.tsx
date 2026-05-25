'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Minus,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { productsApi } from '@/lib/inventory-api';
import { cajaApi, type EstadoCaja, type ReporteZ } from '@/lib/caja-api';
import { formatCurrency } from '@/lib/format-currency';
import {
  AperturaCajaScreen,
  CierreCajaScreen,
  PosReporteZScreen,
} from '@/components/pos/caja-screens';
import { PosPaymentModal, type PosPaymentMethod } from '@/components/pos/pos-payment-modal';
import { PosShell } from '@/components/pos/pos-shell';
import { Button } from '@/components/ui/button';
import { MoneyDisplay } from '@/components/ui/money-display';
import { cn } from '@/lib/cn';
import { roundCurrency, BASE_CURRENCY, type PosChangeInput, type PosPaymentInput } from '@flp/shared';
import type { Product } from '@/types/inventory';
import type { PosSaleReceipt } from '@/types/pos-receipt';
import { PosReceiptPrint } from '@/components/print/pos-receipt-print';
import { PosCustomerPanel, type PosCustomer } from '@/components/pos/pos-customer-panel';
import { PosProductLabel } from '@/components/pos/pos-product-label';

interface PaymentMethod extends PosPaymentMethod {}

interface CartLine {
  product: Product;
  quantity: number;
}

type PosView = 'pos' | 'cierre' | 'reporte-z';

export default function PosPage() {
  const [checkingCaja, setCheckingCaja] = useState(true);
  const [estadoCaja, setEstadoCaja] = useState<EstadoCaja | null>(null);
  const [view, setView] = useState<PosView>('pos');
  const [reporteZ, setReporteZ] = useState<ReporteZ | null>(null);
  const [showReporteX, setShowReporteX] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [lastSale, setLastSale] = useState<PosSaleReceipt | null>(null);
  const [receiptToPrint, setReceiptToPrint] = useState<PosSaleReceipt | null>(null);
  const [customer, setCustomer] = useState<PosCustomer | null>(null);

  const refreshEstado = useCallback(async () => {
    const estado = await cajaApi.estadoActual();
    if ('abierta' in estado && !estado.abierta) {
      setEstadoCaja(null);
      return null;
    }
    const abierta = estado as EstadoCaja;
    setEstadoCaja(abierta);
    return abierta;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const estado = await cajaApi.estadoActual();
        if (!cancelled) {
          if ('abierta' in estado && !estado.abierta) {
            setEstadoCaja(null);
          } else {
            setEstadoCaja(estado as EstadoCaja);
          }
        }
      } catch {
        if (!cancelled) setEstadoCaja(null);
      } finally {
        if (!cancelled) setCheckingCaja(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!estadoCaja) return;
    const q = searchDebounced.trim();
    productsApi
      .list({
        limit: 48,
        isActive: true,
        ...(q ? { search: q } : {}),
      })
      .then((r) => setProducts(r.data))
      .catch(() => setProducts([]));
    apiFetch<PaymentMethod[]>('/payment-methods').then(setPaymentMethods).catch(() => {});
  }, [estadoCaja, searchDebounced]);

  const filtered = useMemo(() => products, [products]);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function updateQty(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) =>
          l.product.id === productId
            ? { ...l, quantity: Math.max(0.001, roundCurrency(l.quantity + delta, BASE_CURRENCY)) }
            : l,
        )
        .filter((l) => l.quantity >= 0.001),
    );
  }

  function setQty(productId: string, raw: string) {
    const qty = parseFloat(raw);
    if (!raw || Number.isNaN(qty) || qty < 0.001) {
      setCart((prev) => prev.filter((l) => l.product.id !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((l) =>
        l.product.id === productId
          ? { ...l, quantity: roundCurrency(qty, BASE_CURRENCY) }
          : l,
      ),
    );
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.product.id !== productId));
  }

  const tasa = cart[0]?.product.tasaBcvActual ?? products[0]?.tasaBcvActual ?? 0;
  const totalUsd = roundCurrency(
    cart.reduce(
      (s, l) =>
        s + roundCurrency(l.product.salePriceUsd * l.quantity, BASE_CURRENCY),
      0,
    ),
    BASE_CURRENCY,
  );
  const totalVes = roundCurrency(
    cart.reduce((s, l) => {
      const unitVes = l.product.salePriceVes ?? l.product.salePriceUsd * tasa;
      return s + roundCurrency(unitVes * l.quantity, 'VES');
    }, 0),
    'VES',
  );

  async function checkout(payload: { payments: PosPaymentInput[]; change?: PosChangeInput }) {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const result = await apiFetch<PosSaleReceipt>('/pos/sales', {
        method: 'POST',
        body: JSON.stringify({
          lines: cart.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
          payments: payload.payments,
          change: payload.change,
          customerId: customer?.id,
        }),
      });
      setLastSale(result);
      setReceiptToPrint(result);
      setCart([]);
      setCustomer(null);
      setShowPaymentModal(false);
      await refreshEstado();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error en venta');
    } finally {
      setLoading(false);
    }
  }

  if (checkingCaja) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-slate-100">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white font-bold text-xl shadow-lg shadow-indigo-600/30">
          D
        </div>
        <p className="text-sm font-medium text-slate-500">Donaive — Verificando caja...</p>
      </div>
    );
  }

  if (!estadoCaja) {
    return (
      <AperturaCajaScreen
        onSuccess={(estado) => {
          setEstadoCaja(estado);
          setView('pos');
        }}
      />
    );
  }

  if (view === 'reporte-z' && reporteZ) {
    return (
      <PosReporteZScreen
        reporte={reporteZ}
        onDone={() => {
          setReporteZ(null);
          setEstadoCaja(null);
          setView('pos');
          setCart([]);
          setLastSale(null);
        }}
      />
    );
  }

  if (view === 'cierre') {
    return (
      <div className="min-h-screen bg-slate-100">
        <PosShell
          estado={estadoCaja}
          onReporteX={() => setShowReporteX(true)}
          onCerrarCaja={() => {}}
        >
          <div className="overflow-y-auto p-4 sm:p-6">
            <CierreCajaScreen
              estado={estadoCaja}
              onClosed={(reporte) => {
                setReporteZ(reporte);
                setView('reporte-z');
              }}
              onCancel={() => setView('pos')}
            />
          </div>
        </PosShell>
      </div>
    );
  }

  return (
    <PosShell
      estado={estadoCaja}
      onReporteX={() => setShowReporteX(true)}
      onCerrarCaja={() => setView('cierre')}
    >
      {showReporteX && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/40">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-100 bg-white shadow-2xl shadow-slate-900/20">
            <div className="sticky top-0 flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-100 bg-white">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">Reporte X</h2>
                <p className="text-sm text-slate-500 mt-0.5">Estado actual de la caja abierta</p>
              </div>
              <button
                type="button"
                onClick={() => setShowReporteX(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all duration-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Ventas del turno
                </p>
                <p className="text-lg font-bold text-slate-900 mt-1">
                  {estadoCaja.resumenVentas.cantidadVentas} transacciones
                </p>
                <p className="text-2xl font-bold text-indigo-700 tabular-nums mt-2">
                  {formatCurrency(
                    estadoCaja.resumenVentas.totalCobradoUsd ?? estadoCaja.resumenVentas.totalVentasUsd,
                  )}{' '}
                  <span className="text-sm font-medium text-slate-500">USD cobrado</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Incluye Bs recibidos convertidos a BCV · Bs físicos:{' '}
                  {formatCurrency(estadoCaja.resumenVentas.totalBsRecibidos ?? 0, 'VES')}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Fondo inicial: {formatCurrency(estadoCaja.session.openingBalanceUsd)} +{' '}
                  {formatCurrency(estadoCaja.session.openingBalanceVes, 'VES')}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 overflow-hidden">
                <table className="w-full text-sm min-w-[480px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-3 font-semibold text-slate-600">Método</th>
                      <th className="text-right p-3 font-semibold text-slate-600">USD</th>
                      <th className="text-right p-3 font-semibold text-slate-600">Bs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estadoCaja.arqueoEsperado.map((line) => (
                      <tr key={line.paymentMethodId} className="border-t border-slate-100">
                        <td className="p-3 text-slate-800">{line.paymentMethodName}</td>
                        <td className="p-3 text-right tabular-nums font-medium">
                          {formatCurrency(line.montoEsperadoUsd)}
                        </td>
                        <td className="p-3 text-right tabular-nums text-slate-600">
                          {formatCurrency(line.montoEsperadoVes, 'VES')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button type="button" onClick={() => window.print()} className="print:hidden w-full">
                Imprimir Reporte X
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row h-full min-h-0">
        <aside className="w-full md:w-[min(420px,38vw)] md:max-w-[420px] md:shrink-0 flex flex-col border-b md:border-b-0 md:border-r border-slate-200/80 bg-white md:max-h-full max-h-[42vh] md:max-h-none order-2 md:order-1">
          <div className="shrink-0 px-5 py-4 border-b border-slate-100 space-y-3">
            <PosCustomerPanel customer={customer} onSelect={setCustomer} />
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-indigo-600" />
              <h2 className="font-bold text-slate-900 tracking-tight">Factura actual</h2>
              {cart.length > 0 && (
                <span className="ml-auto text-xs font-semibold tabular-nums bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                  {cart.reduce((n, l) => n + l.quantity, 0)} ítems
                </span>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center px-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                  <ShoppingCart className="h-7 w-7" />
                </div>
                <p className="text-sm font-medium text-slate-600">Carrito vacío</p>
                <p className="text-xs text-slate-400 mt-1">Seleccione productos del catálogo</p>
              </div>
            ) : (
              <ul className="space-y-1">
                {cart.map((l) => {
                  const lineUsd = roundCurrency(l.product.salePriceUsd * l.quantity, BASE_CURRENCY);
                  const unitVes = l.product.salePriceVes ?? l.product.salePriceUsd * tasa;
                  const lineVes = roundCurrency(unitVes * l.quantity, 'VES');
                  return (
                    <li
                      key={l.product.id}
                      className="flex gap-3 items-center rounded-xl px-3 py-4 hover:bg-slate-50/80 transition-colors duration-200"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                        <Package className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <PosProductLabel product={l.product} compact />
                        <div className="flex items-center gap-1.5 mt-2">
                          <button
                            type="button"
                            onClick={() => updateQty(l.product.id, -1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all duration-200"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <input
                            type="number"
                            min="0.001"
                            step="0.001"
                            value={l.quantity}
                            onChange={(e) => setQty(l.product.id, e.target.value)}
                            className="w-16 text-center text-sm font-semibold tabular-nums border border-slate-200 rounded-lg px-1 py-0.5"
                          />
                          <button
                            type="button"
                            onClick={() => updateQty(l.product.id, 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all duration-200"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm tabular-nums text-slate-900">
                          {formatCurrency(lineUsd)}
                        </p>
                        <p className="text-xs tabular-nums text-slate-500">
                          {formatCurrency(lineVes, 'VES')}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeLine(l.product.id)}
                          className="mt-2 p-1 text-slate-400 hover:text-rose-500 transition-colors duration-200"
                          aria-label="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="shrink-0 p-4 border-t border-slate-100">
            <div className="rounded-xl bg-slate-50 p-4 space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-medium text-slate-600">Total USD</span>
                <span className="text-2xl font-bold tabular-nums text-slate-900">
                  {formatCurrency(totalUsd)}
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-medium text-slate-600">Total Bs</span>
                <span className="text-lg font-bold tabular-nums text-indigo-700">
                  {formatCurrency(totalVes, 'VES')}
                </span>
              </div>
              {tasa > 0 && (
                <p className="text-[11px] text-slate-400 tabular-nums">
                  Tasa BCV: {tasa.toLocaleString('es-VE')} Bs/USD
                </p>
              )}
              <Button
                type="button"
                size="lg"
                className="w-full"
                onClick={() => setShowPaymentModal(true)}
                disabled={loading || cart.length === 0}
              >
                {loading ? 'Procesando...' : 'Cobrar'}
              </Button>
              {lastSale && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-center">
                  <p className="text-sm font-semibold text-emerald-800">Venta {lastSale.number}</p>
                  <p className="text-xs text-emerald-600 mt-0.5 tabular-nums">
                    {formatCurrency(lastSale.totalVes, 'VES')} · Tasa{' '}
                    {lastSale.tasaBcvMomento.toLocaleString('es-VE')}
                    {lastSale.change && (
                      <> · Vuelto {formatCurrency(lastSale.change.amount, lastSale.change.currency)}</>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>
        <main className="flex-1 flex flex-col min-w-0 min-h-0 bg-slate-50/50 order-1 md:order-2">
          <div className="shrink-0 p-4 sm:p-5 border-b border-slate-200/60 bg-white">
            <div className="relative max-w-3xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
              <input
                placeholder="Buscar por nombre, código de barras o marca..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 text-lg rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all duration-200"
                autoFocus
              />
            </div>
            <p className="text-xs text-slate-500 mt-2 ml-1">
              {filtered.length} producto{filtered.length !== 1 ? 's' : ''} · precios en USD y Bs
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addToCart(p)}
                  className={cn(
                    'group flex flex-col rounded-xl border border-slate-200 bg-white p-4 text-left',
                    'hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-500/5',
                    'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30',
                    p.stock <= 0 && 'opacity-60',
                  )}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors duration-200 mb-3">
                    <Package className="h-5 w-5" />
                  </div>
                  <PosProductLabel product={p} />
                </button>
              ))}
            </div>
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Search className="h-10 w-10 mb-3 opacity-50" />
                <p className="text-sm font-medium">Sin resultados</p>
              </div>
            )}
          </div>
        </main>
      </div>

      <PosPaymentModal
        open={showPaymentModal}
        totalUsd={totalUsd}
        totalVes={totalVes}
        tasaBcv={tasa}
        paymentMethods={paymentMethods}
        loading={loading}
        onClose={() => setShowPaymentModal(false)}
        onConfirm={checkout}
      />

      <PosReceiptPrint
        open={!!receiptToPrint}
        receipt={receiptToPrint}
        onClose={() => setReceiptToPrint(null)}
      />
    </PosShell>
  );
}
