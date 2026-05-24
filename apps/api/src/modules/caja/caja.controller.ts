import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { CajaService } from './caja.service';
import { AperturaCajaDto, CierreCajaDto } from './dto/caja.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@Controller('pos/caja')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CajaController {
  constructor(private readonly cajaService: CajaService) {}

  @Post('apertura')
  @RequirePermissions('CASH_REGISTER_OPEN')
  apertura(@Body() dto: AperturaCajaDto, @CurrentUser() user: AuthenticatedUser) {
    return this.cajaService.apertura(dto, user.id);
  }

  @Get('estado-actual')
  @RequirePermissions('CASH_REGISTER_OPEN', 'CASH_REGISTER_CLOSE', 'POS_ACCESS')
  estadoActual(@CurrentUser() user: AuthenticatedUser) {
    return this.cajaService.estadoActual(user.id);
  }

  @Post('cierre')
  @RequirePermissions('CASH_REGISTER_CLOSE')
  cierre(@Body() dto: CierreCajaDto, @CurrentUser() user: AuthenticatedUser) {
    return this.cajaService.cierre(dto, user.id);
  }
}
