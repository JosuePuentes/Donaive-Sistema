import { apiFetch } from './api-client';

export interface Branch {
  id: string;
  code: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  isActive: boolean;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBranchInput {
  code: string;
  name: string;
  address?: string;
  phone?: string;
  isDefault?: boolean;
}

export const branchesApi = {
  list: () => apiFetch<Branch[]>('/branches'),
  listActive: () => apiFetch<Pick<Branch, 'id' | 'code' | 'name' | 'isDefault'>[]>('/branches/active'),
  create: (data: CreateBranchInput) =>
    apiFetch<Branch>('/branches', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<CreateBranchInput & { isActive?: boolean }>) =>
    apiFetch<Branch>(`/branches/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deactivate: (id: string) =>
    apiFetch<Branch>(`/branches/${id}`, { method: 'DELETE' }),
};
