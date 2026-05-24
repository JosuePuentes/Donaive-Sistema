import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { PrintConfigService } from './print-config.service';
import { UpdatePrintConfigDto } from './dto/update-print-config.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PrintConfigController {
  constructor(private readonly printConfigService: PrintConfigService) {}

  @Get('print-config')
  @RequirePermissions('CONFIG_VIEW', 'CONFIG_MANAGE', 'POS_ACCESS')
  getPrintConfig() {
    return this.printConfigService.getConfig();
  }

  @Put('print-config')
  @RequirePermissions('CONFIG_MANAGE')
  updatePrintConfig(@Body() dto: UpdatePrintConfigDto) {
    return this.printConfigService.updateConfig(dto);
  }
}
