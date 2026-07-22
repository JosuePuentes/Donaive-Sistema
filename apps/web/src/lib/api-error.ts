export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function formatApiError(err: unknown, fallback = 'Error desconocido'): string {
  if (!(err instanceof Error)) return fallback;
  const msg = err.message;
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return 'No se pudo conectar con la API. Verifique que el servidor esté activo y NEXT_PUBLIC_API_URL.';
  }
  if (msg.includes('Acceso denegado')) {
    return 'No tiene permiso para esta acción. Contacte al administrador.';
  }
  if (msg.includes('sucursal asignada')) {
    return 'Su usuario no tiene sucursal asignada. Pida al administrador que la configure.';
  }
  if (msg.includes('must not be greater than') || msg.includes('Bad Request')) {
    return 'Parámetros de búsqueda inválidos. Recargue la página.';
  }
  return msg;
}
