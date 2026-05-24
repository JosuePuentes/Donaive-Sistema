'use client';

import { clearAuthToken } from '@/lib/api-client';

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => {
        clearAuthToken();
        window.location.href = '/login';
      }}
      className="mt-auto px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 text-left"
    >
      Cerrar sesión
    </button>
  );
}
