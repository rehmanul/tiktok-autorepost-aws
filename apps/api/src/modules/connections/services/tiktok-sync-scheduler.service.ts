import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { JobsService } from '../../jobs/jobs.service';
import { ConnectionStatus, JobKind, SocialPlatform } from '@prisma/client';

@Injectable()
export class TikTokSyncSchedulerService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(TikTokSyncSchedulerService.name);
    private readonly SYNC_INTERVAL_MINUTES = 30; // Default: sync every 30 minutes

    constructor(
        private prisma: PrismaService,
        private jobs: JobsService
    ) { }

    onModuleInit() {
        // Run initial sync after 1 minute, then on schedule
        setTimeout(() => {
            this.scheduleTikTokSyncs().catch((err) => {
                this.logger.error('Failed to run initial TikTok sync check', err);
            });
        }, 60000);
    }

    onModuleDestroy() {
        // Cleanup if needed
    }

    /**
     * Schedule sync jobs for active TikTok connections
     * Runs every 30 minutes
     */
    @Cron('*/30 * * * *')
    async scheduleTikTokSyncs() {
        this.logger.log('Checking for TikTok accounts to sync...');

        const connections = await this.prisma.connection.findMany({
            where: {
                platform: SocialPlatform.TIKTOK,
                status: ConnectionStatus.ACTIVE
            },
            include: {
                user: true,
                sourceRules: {
                    where: {
                        isActive: true
                    },
                    take: 1
                }
            }
        });

        // Only sync connections that have active rules
        const connectionsWithRules = connections.filter((conn) => (conn.sourceRules?.length ?? 0) > 0);

        this.logger.log(`Found ${connectionsWithRules.length} TikTok connections with active rules`);

        let scheduled = 0;
        let skipped = 0;

        for (const connection of connectionsWithRules) {
            // Check last sync time - don't sync if done recently (within 25 minutes)
            const lastSync = connection.lastSyncedAt;
            const now = new Date();
            const timeSinceSync = lastSync ? now.getTime() - lastSync.getTime() : Infinity;
            const minInterval = 25 * 60 * 1000; // 25 minutes

            if (timeSinceSync < minInterval) {
                skipped++;
                continue;
            }

            // Check if sync job already exists
            const existingJob = await this.prisma.processingJob.findFirst({
                where: {
                    kind: JobKind.TIKTOK_SYNC,
                    sourceConnectionId: connection.id,
                    status: {
                        in: ['PENDING', 'SCHEDULED', 'RUNNING']
                    },
                    createdAt: {
                        gte: new Date(now.getTime() - 30 * 60 * 1000) // Within last 30 minutes
                    }
                }
            });

            if (existingJob) {
                skipped++;
                continue;
            }

            try {
                await this.jobs.scheduleJob({
                    tenantId: connection.tenantId,
                    userId: connection.userId,
                    kind: JobKind.TIKTOK_SYNC,
                    sourceConnectionId: connection.id,
                    payload: {
                        reason: 'scheduled-sync',
                        platform: connection.platform,
                        accountHandle: connection.accountHandle
                    }
                });

                scheduled++;
                this.logger.debug(`Scheduled TikTok sync for ${connection.accountHandle}`);
            } catch (error) {
                this.logger.error(`Failed to schedule TikTok sync for ${connection.id}`, error);
            }
        }

        this.logger.log(`TikTok sync scheduling complete: ${scheduled} scheduled, ${skipped} skipped`);
    }
}

