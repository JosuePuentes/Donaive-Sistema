import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { PurgeOperationalDataDto } from './dto/purge-operational-data.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post('purge-operational-data')
  @RequirePermissions('CONFIG_MANAGE')
  purgeOperationalData(@Body() dto: PurgeOperationalDataDto) {
    return this.maintenanceService.purgeOperationalData(dto.confirm);
  }
}
