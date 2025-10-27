import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from '../config/app.config';
import { HealthController } from '../controllers/health.controller';
import { DatabaseModule } from './database/database.module';
import { StorageModule } from './storage/storage.module';
import { QueueModule } from './queue/queue.module';
import { SecurityModule } from './security/security.module';
import { JobsModule } from './jobs/jobs.module';
import { ConnectionsModule } from './connections/connections.module';
import { RulesModule } from './rules/rules.module';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig]
    }),
    DatabaseModule,
    StorageModule,
    QueueModule,
    SecurityModule,
    JobsModule,
    ConnectionsModule,
    RulesModule,
    MetricsModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
