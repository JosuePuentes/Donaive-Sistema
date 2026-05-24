import { Controller, Get, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  private parseDays(value: string | undefined, fallback: number): number {
    if (!value) return fallback;
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed < 1 || parsed > 365) {
      throw new BadRequestException('Parámetro days inválido (1-365)');
    }
    return parsed;
  }

  @Get('dashboard')
  @RequirePermissions('REPORTS_DAILY_SALES', 'REPORTS_SALES_BOOK', 'REPORTS_INVENTORY_ANALYSIS', 'REPORTS_CASH_FLOW')
  getDashboard() {
    return this.reportsService.getDashboardSummary();
  }

  @Get('ventas/diario')
  @RequirePermissions('REPORTS_DAILY_SALES', 'REPORTS_SALES_BOOK')
  getVentasDiarias(@Query('days') days?: string) {
    return this.reportsService.getVentasDiarias(this.parseDays(days, 30));
  }

  @Get('ventas/metodos-pago')
  @RequirePermissions('REPORTS_DAILY_SALES', 'REPORTS_SALES_BOOK')
  getMetodosPago(@Query('days') days?: string) {
    return this.reportsService.getVentasPorMetodoPago(this.parseDays(days, 30));
  }

  @Get('inventario/analisis')
  @RequirePermissions('REPORTS_INVENTORY_ANALYSIS')
  getInventario(@Query('coverageDays') coverageDays?: string) {
    return this.reportsService.getAnalisisInventario(this.parseCoverageDays(coverageDays));
  }

  private parseCoverageDays(value: string | undefined): number {
    if (!value) return 45;
    const parsed = parseInt(value, 10);
    const allowed = [15, 30, 45, 60];
    if (!allowed.includes(parsed)) {
      throw new BadRequestException('coverageDays debe ser 15, 30, 45 o 60');
    }
    return parsed;
  }

  @Get('flujo-caja')
  @RequirePermissions('REPORTS_CASH_FLOW')
  getFlujoCaja(@Query('days') days?: string) {
    return this.reportsService.getFlujoCajaProyectado(this.parseDays(days, 90));
  }
}
