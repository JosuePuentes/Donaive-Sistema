import { Controller, Get, Post, Put, Body, Query, UseGuards } from '@nestjs/common';
import { TasaBcvService } from './tasa-bcv.service';
import { CreateTasaBcvDto, UpsertTasaBcvHoyDto } from './dto/tasa-bcv.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@Controller('tasa-bcv')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TasaBcvController {
  constructor(private readonly tasaBcvService: TasaBcvService) {}

  /** Tasa BCV vigente (del día o la más reciente) */
  @Get('actual')
  @RequirePermissions('EXCHANGE_RATE_VIEW', 'PRODUCTS_VIEW', 'POS_ACCESS')
  getTasaActual() {
    return this.tasaBcvService.getTasaActual();
  }

  /** Tasa del día específico (hoy por defecto) */
  @Get('hoy')
  @RequirePermissions('EXCHANGE_RATE_VIEW')
  async getTasaHoy() {
    const tasa = await this.tasaBcvService.getTasaDelDia();
    if (!tasa) {
      return { registrada: false, message: 'No hay tasa registrada para hoy' };
    }
    return { registrada: true, ...tasa };
  }

  /** Historial de tasas BCV */
  @Get()
  @RequirePermissions('EXCHANGE_RATE_VIEW')
  getHistorial(@Query('limit') limit?: string) {
    return this.tasaBcvService.getHistorial(limit ? parseInt(limit, 10) : 30);
  }

  /** Registrar tasa para una fecha específica */
  @Post()
  @RequirePermissions('EXCHANGE_RATE_MANAGE')
  registrar(@Body() dto: CreateTasaBcvDto, @CurrentUser() user: AuthenticatedUser) {
    return this.tasaBcvService.registrar(dto, user.id);
  }

  /** Actualizar/crear tasa del día actual (panel admin) */
  @Put('hoy')
  @RequirePermissions('EXCHANGE_RATE_MANAGE')
  upsertHoy(@Body() dto: UpsertTasaBcvHoyDto, @CurrentUser() user: AuthenticatedUser) {
    return this.tasaBcvService.upsertTasaHoy(dto, user.id);
  }
}

/** Alias retrocompatible con ruta anterior */
@Controller('exchange-rates')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExchangeRateLegacyController {
  constructor(private readonly tasaBcvService: TasaBcvService) {}

  @Get()
  @RequirePermissions('EXCHANGE_RATE_VIEW')
  findAll(@Query('limit') limit?: string) {
    return this.tasaBcvService.getHistorial(limit ? parseInt(limit, 10) : 30);
  }

  @Post()
  @RequirePermissions('EXCHANGE_RATE_MANAGE')
  create(
    @Body() dto: { rateDate: string; usdToVes: number; source?: string; notes?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasaBcvService.registrar(
      {
        fecha: dto.rateDate,
        montoBs: dto.usdToVes,
        fuente: dto.source as 'BCV' | 'MANUAL' | undefined,
        notas: dto.notes,
      },
      user.id,
    );
  }
}
