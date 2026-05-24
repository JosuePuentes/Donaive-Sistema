import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { CxpService } from './cxp.service';
import { CxpAbonoDto } from './dto/cxp.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@Controller('purchases/cxp')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CxpController {
  constructor(private readonly cxpService: CxpService) {}

  @Get('pendientes')
  @RequirePermissions('ACCOUNTS_PAYABLE_VIEW', 'PURCHASES_VIEW')
  findPendientes(@Query('supplierId') supplierId?: string) {
    return this.cxpService.findPendientes(supplierId);
  }

  @Post('abonar')
  @RequirePermissions('ACCOUNTS_PAYABLE_MANAGE')
  registrarAbono(@Body() dto: CxpAbonoDto, @CurrentUser() user: AuthenticatedUser) {
    return this.cxpService.registrarAbono(dto, user.id);
  }
}
