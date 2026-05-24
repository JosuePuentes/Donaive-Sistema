import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'Ferretería Los Puentes API',
      timestamp: new Date().toISOString(),
    };
  }
}
