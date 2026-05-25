import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'Donaive API',
      timestamp: new Date().toISOString(),
      build: process.env.RENDER_GIT_COMMIT ?? process.env.BUILD_ID ?? 'local',
      features: [
        'reports-export',
        'products-import-preview',
        'users-roles',
      ],
    };
  }
}
