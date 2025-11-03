import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SecurityModule } from '../security/security.module';
import { JobsModule } from '../jobs/jobs.module';
import { ConnectionsService } from './connections.service';
import { ConnectionsController } from './connections.controller';
import { TokenRefreshSchedulerService } from './services/token-refresh-scheduler.service';
import { TikTokSyncSchedulerService } from './services/tiktok-sync-scheduler.service';

@Module({
  imports: [DatabaseModule, SecurityModule, JobsModule],
  controllers: [ConnectionsController],
  providers: [ConnectionsService, TokenRefreshSchedulerService, TikTokSyncSchedulerService],
  exports: [ConnectionsService]
})
export class ConnectionsModule {}
