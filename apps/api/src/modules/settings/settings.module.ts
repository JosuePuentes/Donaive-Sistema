import { Module } from '@nestjs/common';
import { PrintConfigController } from './print-config.controller';
import { PrintConfigService } from './print-config.service';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';

@Module({
  controllers: [PrintConfigController, MaintenanceController],
  providers: [PrintConfigService, MaintenanceService],
  exports: [PrintConfigService, MaintenanceService],
})
export class SettingsModule {}
