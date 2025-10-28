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
import { DashboardModule } from './dashboard/dashboard.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { ActivityModule } from './activity/activity.module';
import { SettingsModule } from './settings/settings.module';

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
    MetricsModule,
    DashboardModule,
    TenantsModule,
    UsersModule,
    ActivityModule,
    SettingsModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
