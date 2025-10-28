import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SettingsService {
  constructor(private readonly configService: ConfigService) {}

  getSystemConfig() {
    const environment = this.configService.get<string>('env') ?? 'development';
    const port = this.configService.get<number>('port') ?? 4000;
    const databaseUrl = this.configService.get<string>('databaseUrl') ?? '';
    const redisUrl = this.configService.get<string>('redis.url') ?? 'redis://localhost:6379';
    const redisTls = this.configService.get<boolean>('redis.tls') ?? false;
    const prometheusEnabled = (process.env.PROMETHEUS_ENABLED ?? 'false').toLowerCase() === 'true';

    return {
      environment,
      runtime: {
        port
      },
      database: this.parseDatabaseUrl(databaseUrl),
      redis: this.parseRedisUrl(redisUrl, redisTls),
      features: {
        metrics: prometheusEnabled
      }
    };
  }

  private parseDatabaseUrl(url: string) {
    if (!url) {
      return null;
    }
    try {
      const parsed = new URL(url);
      return {
        protocol: parsed.protocol.replace(':', ''),
        host: parsed.hostname,
        port: parsed.port ? Number.parseInt(parsed.port, 10) : undefined,
        database: parsed.pathname.replace('/', '') || undefined,
        parameters: parsed.searchParams.size
          ? Object.fromEntries(parsed.searchParams.entries())
          : undefined
      };
    } catch {
      return {
        raw: url
      };
    }
  }

  private parseRedisUrl(url: string, tls: boolean) {
    try {
      const parsed = new URL(url);
      return {
        protocol: parsed.protocol.replace(':', ''),
        host: parsed.hostname,
        port: parsed.port ? Number.parseInt(parsed.port, 10) : undefined,
        tls
      };
    } catch {
      return {
        raw: url,
        tls
      };
    }
  }
}
