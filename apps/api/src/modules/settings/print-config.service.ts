import { Injectable } from '@nestjs/common';
import type { PrintTemplateConfig, PaperType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DEFAULT_PRINT_CONFIG } from '@flp/shared';
import type { UpdatePrintConfigDto } from './dto/update-print-config.dto';

export type PrintConfigResponse = {
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
  updatedAt: string;
};

@Injectable()
export class PrintConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig(): Promise<PrintConfigResponse> {
    const row = await this.ensureConfig();
    return this.toResponse(row);
  }

  async updateConfig(dto: UpdatePrintConfigDto): Promise<PrintConfigResponse> {
    await this.ensureConfig();
    const row = await this.prisma.printTemplateConfig.update({
      where: { id: 'default' },
      data: {
        ...(dto.tipoPapel !== undefined && { tipoPapel: dto.tipoPapel }),
        ...(dto.nombreEmpresa !== undefined && { nombreEmpresa: dto.nombreEmpresa }),
        ...(dto.rif !== undefined && { rif: dto.rif }),
        ...(dto.direccion !== undefined && { direccion: dto.direccion }),
        ...(dto.telefono !== undefined && { telefono: dto.telefono }),
        ...(dto.mensajePersonalizado !== undefined && {
          mensajePersonalizado: dto.mensajePersonalizado,
        }),
        ...(dto.mostrarTasaBcv !== undefined && { mostrarTasaBcv: dto.mostrarTasaBcv }),
        ...(dto.mostrarPreciosBs !== undefined && { mostrarPreciosBs: dto.mostrarPreciosBs }),
        ...(dto.mostrarCajero !== undefined && { mostrarCajero: dto.mostrarCajero }),
        ...(dto.mostrarLogo !== undefined && { mostrarLogo: dto.mostrarLogo }),
        ...(dto.piePagina !== undefined && { piePagina: dto.piePagina }),
      },
    });
    return this.toResponse(row);
  }

  private async ensureConfig(): Promise<PrintTemplateConfig> {
    const existing = await this.prisma.printTemplateConfig.findUnique({
      where: { id: 'default' },
    });
    if (existing) return existing;

    return this.prisma.printTemplateConfig.create({
      data: {
        id: 'default',
        tipoPapel: DEFAULT_PRINT_CONFIG.tipoPapel,
        nombreEmpresa: DEFAULT_PRINT_CONFIG.nombreEmpresa,
        rif: DEFAULT_PRINT_CONFIG.rif,
        direccion: DEFAULT_PRINT_CONFIG.direccion,
        telefono: DEFAULT_PRINT_CONFIG.telefono,
        mensajePersonalizado: DEFAULT_PRINT_CONFIG.mensajePersonalizado,
        mostrarTasaBcv: DEFAULT_PRINT_CONFIG.mostrarTasaBcv,
        mostrarPreciosBs: DEFAULT_PRINT_CONFIG.mostrarPreciosBs,
        mostrarCajero: DEFAULT_PRINT_CONFIG.mostrarCajero,
        mostrarLogo: DEFAULT_PRINT_CONFIG.mostrarLogo,
        piePagina: DEFAULT_PRINT_CONFIG.piePagina,
      },
    });
  }

  private toResponse(row: PrintTemplateConfig): PrintConfigResponse {
    return {
      id: row.id,
      tipoPapel: row.tipoPapel,
      nombreEmpresa: row.nombreEmpresa,
      rif: row.rif,
      direccion: row.direccion,
      telefono: row.telefono,
      mensajePersonalizado: row.mensajePersonalizado,
      mostrarTasaBcv: row.mostrarTasaBcv,
      mostrarPreciosBs: row.mostrarPreciosBs,
      mostrarCajero: row.mostrarCajero,
      mostrarLogo: row.mostrarLogo,
      piePagina: row.piePagina,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
