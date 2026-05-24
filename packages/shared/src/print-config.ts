export type PaperType = 'TICKET_80MM' | 'TICKET_58MM' | 'CARTA';

export interface PrintTemplateConfig {
  id: string;
  tipoPapel: PaperType;
  nombreEmpresa: string;
  rif: string;
  direccion: string;
  telefono: string;
  mensajePersonalizado: string | null;
  mostrarTasaBcv: boolean;
  mostrarPreciosBs: boolean;
  mostrarCajero: boolean;
  mostrarLogo: boolean;
  piePagina: string | null;
  updatedAt?: string;
}

export interface UpdatePrintTemplateConfigInput {
  tipoPapel?: PaperType;
  nombreEmpresa?: string;
  rif?: string;
  direccion?: string;
  telefono?: string;
  mensajePersonalizado?: string | null;
  mostrarTasaBcv?: boolean;
  mostrarPreciosBs?: boolean;
  mostrarCajero?: boolean;
  mostrarLogo?: boolean;
  piePagina?: string | null;
}

export const PAPER_WIDTH_MM: Record<PaperType, number> = {
  TICKET_80MM: 80,
  TICKET_58MM: 58,
  CARTA: 216,
};

export const DEFAULT_PRINT_CONFIG: PrintTemplateConfig = {
  id: 'default',
  tipoPapel: 'TICKET_80MM',
  nombreEmpresa: 'Donaive',
  rif: 'J-00000000-0',
  direccion: 'Av. Principal, Local 1',
  telefono: '+58 000-0000000',
  mensajePersonalizado: null,
  mostrarTasaBcv: true,
  mostrarPreciosBs: true,
  mostrarCajero: true,
  mostrarLogo: true,
  piePagina: 'Gracias por su compra',
};
