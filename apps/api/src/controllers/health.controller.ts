import { Controller, Get } from '@nestjs/common';
import { Public } from '../modules/auth/decorators/public.decorator';
import { PrismaService } from '../modules/database/prisma.service';

@Controller()
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Public()
  @Get('health')
  async getHealth() {
    let dbStatus = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      dbStatus = 'error';
    }

    return {
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      service: 'api',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbStatus
      }
    };
  }

  @Public()
  @Get('api/health')
  getApiHealth() {
    return this.getHealth();
  }
}
