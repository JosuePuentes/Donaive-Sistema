import { apiFetch } from './api-client';
import type { PrintTemplateConfig, UpdatePrintTemplateConfigInput } from '@flp/shared';

export const printConfigApi = {
  get: () => apiFetch<PrintTemplateConfig>('/settings/print-config'),

  update: (data: UpdatePrintTemplateConfigInput) =>
    apiFetch<PrintTemplateConfig>('/settings/print-config', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};
