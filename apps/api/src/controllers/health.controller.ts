import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get()
  getRoot() {
    return {
      status: 'ok',
      service: 'api',
      timestamp: new Date().toISOString(),
      message: 'Autorepost API'
    };
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'api',
      timestamp: new Date().toISOString()
    };
  }

  @Get('api/health')
  getApiHealth() {
    return this.getHealth();
  }
}
