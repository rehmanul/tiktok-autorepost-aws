import {
  INestApplication,
  Injectable,
  OnModuleDestroy,
  OnModuleInit
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient<Prisma.PrismaClientOptions, 'query' | 'beforeExit'>
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    let url = process.env.DATABASE_URL;
    if (url && url.includes('6543') && url.includes('supabase') && !url.includes('pgbouncer=true')) {
      url += url.includes('?') ? '&pgbouncer=true' : '?pgbouncer=true';
    }
    super(url ? { datasources: { db: { url } } } : undefined);
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  enableShutdownHooks(app: INestApplication): void {
    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
    signals.forEach((signal) => {
      process.once(signal, async () => {
        await app.close();
      });
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
