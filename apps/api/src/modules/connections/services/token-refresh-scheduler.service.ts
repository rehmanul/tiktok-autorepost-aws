import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { JobsService } from '../../jobs/jobs.service';
import { ConnectionStatus, JobKind } from '@prisma/client';

@Injectable()
export class TokenRefreshSchedulerService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(TokenRefreshSchedulerService.name);
    private interval?: NodeJS.Timeout;

    constructor(
        private prisma: PrismaService,
        private jobs: JobsService
    ) { }

    onModuleInit() {
        // Run immediately on startup, then on schedule
        this.checkAndScheduleTokenRefresh().catch((err) => {
            this.logger.error('Failed to run initial token refresh check', err);
        });
    }

    onModuleDestroy() {
        if (this.interval) {
            clearInterval(this.interval);
        }
    }

    /**
     * Mark expired connections as EXPIRED status
     * Runs every 15 minutes
     */
    @Cron('*/15 * * * *')
    async markExpiredConnections() {
        const now = new Date();

        const expired = await this.prisma.connection.updateMany({
            where: {
                status: ConnectionStatus.ACTIVE,
                expiresAt: {
                    lte: now,
                    not: null
                }
            },
            data: {
                status: ConnectionStatus.EXPIRED
            }
        });

        if (expired.count > 0) {
            this.logger.warn(`Marked ${expired.count} connections as expired`);
        }
    }

    /**
     * Check for connections with tokens expiring soon and schedule refresh jobs
     * Runs every hour
     */
    @Cron(CronExpression.EVERY_HOUR)
    async checkAndScheduleTokenRefresh() {
        this.logger.log('Checking for tokens that need refresh...');

        const now = new Date();
        const refreshWindow = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours ahead

        const connections = await this.prisma.connection.findMany({
            where: {
                status: ConnectionStatus.ACTIVE,
                expiresAt: {
                    not: null,
                    lte: refreshWindow,
                    gte: now // Not already expired
                }
            },
            include: {
                user: true
            }
        });

        this.logger.log(`Found ${connections.length} connections needing token refresh`);

        let scheduled = 0;
        let skipped = 0;

        for (const connection of connections) {
            // Check if refresh job already exists
            const existingJob = await this.prisma.processingJob.findFirst({
                where: {
                    kind: JobKind.TOKEN_REFRESH,
                    status: {
                        in: ['PENDING', 'SCHEDULED', 'RUNNING']
                    },
                    OR: [
                        { sourceConnectionId: connection.id },
                        { destinationConnectionId: connection.id }
                    ]
                }
            });

            if (existingJob) {
                this.logger.debug(`Skipping ${connection.id} - refresh job already scheduled`);
                skipped++;
                continue;
            }

            try {
                await this.jobs.scheduleJob({
                    tenantId: connection.tenantId,
                    userId: connection.userId,
                    kind: JobKind.TOKEN_REFRESH,
                    sourceConnectionId: connection.id,
                    payload: {
                        platform: connection.platform,
                        expiresAt: connection.expiresAt?.toISOString()
                    },
                    priority: 10 // High priority for token refresh
                });

                scheduled++;
                this.logger.log(`Scheduled token refresh for connection ${connection.id} (${connection.platform})`);
            } catch (error) {
                this.logger.error(`Failed to schedule token refresh for ${connection.id}`, error);
            }
        }

        this.logger.log(`Token refresh check complete: ${scheduled} scheduled, ${skipped} skipped`);
    }
}

