const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export function setAuthToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('accessToken', token);
  document.cookie = `accessToken=${token}; path=/; max-age=86400; SameSite=Lax`;
}

export function clearAuthToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  document.cookie = 'accessToken=; path=/; max-age=0';
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && typeof window !== 'undefined') {
    clearAuthToken();
    window.location.href = '/login';
    throw new Error('Sesión expirada. Inicie sesión nuevamente.');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
    const message = Array.isArray(error.message)
      ? error.message.join(', ')
      : error.message ?? `HTTP ${response.status}`;
    throw new Error(message);
  }

  return response.json();
}
