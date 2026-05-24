'use client';

import { useCallback, useEffect, useState } from 'react';
import { Printer, Save } from 'lucide-react';
import type { PaperType, PrintTemplateConfig, UpdatePrintTemplateConfigInput } from '@flp/shared';
import { printConfigApi } from '@/lib/print-config-api';
import { PAPER_TYPE_LABELS } from '@/lib/print-utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { TicketReceipt } from '@/components/print/ticket-receipt';
import { SAMPLE_TICKET_RECEIPT } from '@/components/print/ticket-preview-sample';

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 py-3 border-b border-slate-100 last:border-0 cursor-pointer">
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
      />
    </label>
  );
}

export default function PrintConfigPage() {
  const [config, setConfig] = useState<PrintTemplateConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await printConfigApi.get();
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function patch(partial: UpdatePrintTemplateConfigInput) {
    setConfig((prev) => (prev ? { ...prev, ...partial } : prev));
    setSuccess('');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await printConfigApi.update({
        tipoPapel: config.tipoPapel,
        nombreEmpresa: config.nombreEmpresa,
        rif: config.rif,
        direccion: config.direccion,
        telefono: config.telefono,
        mensajePersonalizado: config.mensajePersonalizado,
        mostrarTasaBcv: config.mostrarTasaBcv,
        mostrarPreciosBs: config.mostrarPreciosBs,
        mostrarCajero: config.mostrarCajero,
        mostrarLogo: config.mostrarLogo,
        piePagina: config.piePagina,
      });
      setConfig(updated);
      setSuccess('Configuración guardada correctamente');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 text-center text-slate-500">
        Cargando configuración de impresión...
      </div>
    );
  }

  if (!config) {
    return (
      <div className="max-w-6xl mx-auto py-12">
        <Alert variant="danger">{error || 'No se pudo cargar la configuración'}</Alert>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Printer className="h-7 w-7 text-indigo-600" />
          Formato de impresión
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Personalice tickets y facturas del POS Donaive. La vista previa se actualiza en tiempo real.
        </p>
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}
      {success ? <Alert variant="success">{success}</Alert> : null}

      <form onSubmit={handleSave} className="grid lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Encabezado del ticket</CardTitle>
              <CardDescription>Datos fiscales y de contacto de la empresa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Nombre comercial
                </label>
                <input
                  value={config.nombreEmpresa}
                  onChange={(e) => patch({ nombreEmpresa: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">RIF</label>
                <input
                  value={config.rif}
                  onChange={(e) => patch({ rif: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-mono focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Dirección
                </label>
                <textarea
                  rows={2}
                  value={config.direccion}
                  onChange={(e) => patch({ direccion: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Teléfono
                </label>
                <input
                  value={config.telefono}
                  onChange={(e) => patch({ telefono: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Mensaje personalizado
                </label>
                <input
                  value={config.mensajePersonalizado ?? ''}
                  onChange={(e) => patch({ mensajePersonalizado: e.target.value || null })}
                  placeholder="Ej. Ferretería y suministros"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Papel y opciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Ancho del papel
                </label>
                <select
                  value={config.tipoPapel}
                  onChange={(e) => patch({ tipoPapel: e.target.value as PaperType })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25"
                >
                  {(Object.keys(PAPER_TYPE_LABELS) as PaperType[]).map((key) => (
                    <option key={key} value={key}>
                      {PAPER_TYPE_LABELS[key]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-100 px-3">
                <ToggleRow
                  label="Mostrar logo"
                  description="Iniciales o marca en la parte superior"
                  checked={config.mostrarLogo}
                  onChange={(v) => patch({ mostrarLogo: v })}
                />
                <ToggleRow
                  label="Mostrar tasa BCV"
                  description="Tasa del día en el encabezado"
                  checked={config.mostrarTasaBcv}
                  onChange={(v) => patch({ mostrarTasaBcv: v })}
                />
                <ToggleRow
                  label="Mostrar precios en Bs"
                  description="Columna y totales en bolívares"
                  checked={config.mostrarPreciosBs}
                  onChange={(v) => patch({ mostrarPreciosBs: v })}
                />
                <ToggleRow
                  label="Mostrar cajero"
                  description="Nombre del usuario que facturó"
                  checked={config.mostrarCajero}
                  onChange={(v) => patch({ mostrarCajero: v })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Pie de página
                </label>
                <textarea
                  rows={2}
                  value={config.piePagina ?? ''}
                  onChange={(e) => patch({ piePagina: e.target.value || null })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25"
                />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" size="lg" disabled={saving} className="w-full sm:w-auto">
            <Save className="h-4 w-4" />
            {saving ? 'Guardando...' : 'Guardar configuración'}
          </Button>
        </div>

        <Card className="lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle>Vista previa en vivo</CardTitle>
            <CardDescription>Así se verá el ticket al imprimir desde el POS</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center bg-slate-100/80 rounded-xl py-8 min-h-[480px]">
            <TicketReceipt config={config} data={SAMPLE_TICKET_RECEIPT} mode="preview" />
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
