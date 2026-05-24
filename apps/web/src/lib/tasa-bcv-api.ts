import { apiFetch } from './api-client';

export interface TasaBcv {
  id: string;
  fecha: string;
  montoBs: number;
  fuente: 'BCV' | 'MANUAL';
  notas?: string | null;
  usuarioId?: string | null;
  usuario?: { firstName: string; lastName: string };
  createdAt?: string;
}

export const tasaBcvApi = {
  getActual: () => apiFetch<TasaBcv>('/tasa-bcv/actual'),

  getHoy: () =>
    apiFetch<{ registrada: boolean; montoBs?: number; id?: string; fecha?: string; message?: string }>(
      '/tasa-bcv/hoy',
    ),

  getHistorial: (limit = 30) => apiFetch<TasaBcv[]>(`/tasa-bcv?limit=${limit}`),

  upsertHoy: (montoBs: number, notas?: string) =>
    apiFetch<TasaBcv>('/tasa-bcv/hoy', {
      method: 'PUT',
      body: JSON.stringify({ montoBs, fuente: 'MANUAL', notas }),
    }),

  registrar: (fecha: string, montoBs: number, notas?: string) =>
    apiFetch<TasaBcv>('/tasa-bcv', {
      method: 'POST',
      body: JSON.stringify({ fecha, montoBs, fuente: 'BCV', notas }),
    }),
};
