export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function isMissingExchangeRate(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  if (err.status !== 404) return false;
  return err.message.toLowerCase().includes('tasa bcv');
}

export function shouldShowLoginLink(err: unknown): boolean {
  if (err instanceof ApiError) return err.status === 401;
  if (err instanceof Error) return err.message.includes('Sesión expirada');
  return false;
}

export function isSessionExpiredMessage(message: string): boolean {
  return message.includes('Sesión expirada');
}

export function formatApiError(err: unknown, fallback = 'Error desconocido'): string {
  if (!(err instanceof Error)) return fallback;
  const msg = err.message;

  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return 'No se pudo conectar con la API. Verifique que el servidor esté activo.';
  }
  if (msg.includes('Acceso denegado')) {
    return 'No tiene permiso para esta acción. Contacte al administrador.';
  }
  if (msg.includes('sucursal asignada')) {
    return 'Su usuario no tiene sucursal asignada. Pida al administrador que la configure.';
  }
  if (isMissingExchangeRate(err)) {
    return 'No hay tasa BCV registrada. Regístrela en Configuración → Tasa BCV.';
  }
  if (msg.includes('must not be greater than') || msg.includes('Bad Request')) {
    return 'Parámetros de búsqueda inválidos. Recargue la página.';
  }
  return msg;
}
