import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ExchangeRateSource } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTasaBcvDto, UpsertTasaBcvHoyDto } from './dto/tasa-bcv.dto';

export interface TasaBcvActual {
  id: string;
  fecha: Date;
  montoBs: number;
  fuente: ExchangeRateSource;
  notas: string | null;
  usuarioId: string | null;
}

@Injectable()
export class TasaBcvService {
  constructor(private readonly prisma: PrismaService) {}

  /** Normaliza fecha a medianoche UTC-local */
  private normalizeDate(date: Date): Date {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }

  /** Obtiene la tasa BCV vigente: del día o la más reciente */
  async getTasaActual(): Promise<TasaBcvActual> {
    const today = this.normalizeDate(new Date());

    let tasa = await this.prisma.tasaBCV.findUnique({
      where: { fecha: today },
    });

    if (!tasa) {
      tasa = await this.prisma.tasaBCV.findFirst({
        orderBy: { fecha: 'desc' },
      });
    }

    if (!tasa) {
      throw new NotFoundException(
        'No hay tasa BCV registrada. Registre la tasa del día antes de operar.',
      );
    }

    return this.mapTasa(tasa);
  }

  async getTasaDelDia(fecha?: Date): Promise<TasaBcvActual | null> {
    const target = this.normalizeDate(fecha ?? new Date());
    const tasa = await this.prisma.tasaBCV.findUnique({ where: { fecha: target } });
    return tasa ? this.mapTasa(tasa) : null;
  }

  async getHistorial(limit = 30) {
    const tasas = await this.prisma.tasaBCV.findMany({
      orderBy: { fecha: 'desc' },
      take: limit,
      include: {
        usuario: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return tasas.map((t) => ({
      ...this.mapTasa(t),
      usuario: t.usuario,
      createdAt: t.createdAt,
    }));
  }

  async registrar(dto: CreateTasaBcvDto, usuarioId: string) {
    const fecha = this.normalizeDate(new Date(dto.fecha));
    const existing = await this.prisma.tasaBCV.findUnique({ where: { fecha } });

    if (existing) {
      throw new ConflictException(
        `Ya existe tasa BCV para ${fecha.toISOString().split('T')[0]}. Use actualizar tasa de hoy.`,
      );
    }

    if (dto.montoBs <= 0) {
      throw new BadRequestException('El monto en Bs debe ser mayor a cero');
    }

    const tasa = await this.prisma.tasaBCV.create({
      data: {
        fecha,
        montoBs: dto.montoBs,
        fuente: dto.fuente ?? 'BCV',
        notas: dto.notas,
        usuarioId,
      },
      include: {
        usuario: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return { ...this.mapTasa(tasa), usuario: tasa.usuario, createdAt: tasa.createdAt };
  }

  /** Actualiza o crea la tasa del día actual (uso manual desde admin) */
  async upsertTasaHoy(dto: UpsertTasaBcvHoyDto, usuarioId: string) {
    const fecha = this.normalizeDate(new Date());

    if (dto.montoBs <= 0) {
      throw new BadRequestException('El monto en Bs debe ser mayor a cero');
    }

    const tasa = await this.prisma.tasaBCV.upsert({
      where: { fecha },
      update: {
        montoBs: dto.montoBs,
        fuente: dto.fuente ?? 'MANUAL',
        notas: dto.notas,
        usuarioId,
      },
      create: {
        fecha,
        montoBs: dto.montoBs,
        fuente: dto.fuente ?? 'MANUAL',
        notas: dto.notas,
        usuarioId,
      },
      include: {
        usuario: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return { ...this.mapTasa(tasa), usuario: tasa.usuario, createdAt: tasa.createdAt };
  }

  /** Snapshot numérico para congelación en transacciones */
  async getTasaParaTransaccion(): Promise<number> {
    const tasa = await this.getTasaActual();
    return tasa.montoBs;
  }

  /** Lectura tolerante para reportes cuando aún no hay tasa registrada */
  async getTasaParaTransaccionOptional(): Promise<number | null> {
    try {
      return await this.getTasaParaTransaccion();
    } catch (err) {
      if (err instanceof NotFoundException) return null;
      throw err;
    }
  }

  private mapTasa(tasa: {
    id: string;
    fecha: Date;
    montoBs: { toNumber?: () => number } | number | string;
    fuente: ExchangeRateSource;
    notas: string | null;
    usuarioId: string | null;
  }): TasaBcvActual {
    return {
      id: tasa.id,
      fecha: tasa.fecha,
      montoBs: Number(tasa.montoBs),
      fuente: tasa.fuente,
      notas: tasa.notas,
      usuarioId: tasa.usuarioId,
    };
  }
}
