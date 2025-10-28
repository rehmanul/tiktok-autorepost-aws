import { Injectable } from '@nestjs/common';
import {
  AccountStatus,
  ConnectionStatus,
  JobKind,
  JobStatus,
  Prisma,
  RepostStatus,
  SocialPlatform
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { DashboardOverviewQueryDto } from './dto/dashboard-overview.dto';

type ConnectionHealthBucket = {
  platform: SocialPlatform;
  healthy: number;
  warning: number;
  critical: number;
};

type IncidentStatus = 'new' | 'investigating' | 'mitigated';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(query: DashboardOverviewQueryDto) {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const connectionWhere = query.tenantId
      ? { tenantId: query.tenantId }
      : undefined;
    const jobsTenantFilter = query.tenantId ? { tenantId: query.tenantId } : {};
    const postTenantFilter = query.tenantId
      ? { postLog: { tenantId: query.tenantId } }
      : {};

    const [
      tenantCount,
      connectionCount,
      ruleCount,
      successfulRepostsLast24h,
      connectionGroups,
      completedJobsLast24h,
      failedJobsLast24h,
      retryingJobsLast24h,
      newTenantsLast7d,
      invitedUsersLast7d,
      activeUsersLast7d,
      provisioningJobsLast7d,
      provisioningSucceededLast7d,
      incidentJobs
    ] = await Promise.all([
      query.tenantId
        ? this.prisma.tenant.count({ where: { id: query.tenantId } })
        : this.prisma.tenant.count(),
      this.prisma.connection.count({
        where: connectionWhere
      }),
      this.prisma.autoPostRule.count({
        where: query.tenantId ? { tenantId: query.tenantId } : undefined
      }),
      this.prisma.repostActivity.count({
        where: {
          status: RepostStatus.SUCCEEDED,
          completedAt: {
            gte: last24Hours
          },
          ...postTenantFilter
        }
      }),
      this.prisma.connection.groupBy({
        by: ['platform', 'status'],
        where: connectionWhere,
        _count: { _all: true }
      }),
      this.prisma.processingJob.count({
        where: {
          ...jobsTenantFilter,
          status: JobStatus.SUCCEEDED,
          completedAt: {
            gte: last24Hours
          }
        }
      }),
      this.prisma.processingJob.count({
        where: {
          ...jobsTenantFilter,
          status: JobStatus.FAILED,
          completedAt: {
            gte: last24Hours
          }
        }
      }),
      this.prisma.processingJob.count({
        where: {
          ...jobsTenantFilter,
          status: {
            in: [JobStatus.SCHEDULED, JobStatus.RUNNING, JobStatus.PENDING]
          },
          attempts: {
            gt: 0
          },
          updatedAt: {
            gte: last24Hours
          }
        }
      }),
      query.tenantId
        ? this.prisma.tenant.count({
            where: {
              id: query.tenantId,
              createdAt: {
                gte: last7Days
              }
            }
          })
        : this.prisma.tenant.count({
            where: {
              createdAt: {
                gte: last7Days
              }
            }
          }),
      this.prisma.user.count({
        where: {
          ...(query.tenantId ? { tenantId: query.tenantId } : {}),
          status: AccountStatus.INVITED,
          createdAt: {
            gte: last7Days
          }
        }
      }),
      this.prisma.user.count({
        where: {
          ...(query.tenantId ? { tenantId: query.tenantId } : {}),
          lastLoginAt: {
            gte: last7Days
          }
        }
      }),
      this.prisma.processingJob.count({
        where: {
          ...jobsTenantFilter,
          kind: JobKind.TIKTOK_SYNC,
          createdAt: {
            gte: last7Days
          }
        }
      }),
      this.prisma.processingJob.count({
        where: {
          ...jobsTenantFilter,
          kind: JobKind.TIKTOK_SYNC,
          status: JobStatus.SUCCEEDED,
          completedAt: {
            gte: last7Days
          }
        }
      }),
      this.prisma.processingJob.findMany({
        where: {
          ...jobsTenantFilter,
          status: JobStatus.FAILED,
          updatedAt: {
            gte: last7Days
          }
        },
        orderBy: {
          updatedAt: 'desc'
        },
        take: 8,
        select: {
          id: true,
          kind: true,
          error: true,
          updatedAt: true,
          completedAt: true,
          createdAt: true
        }
      })
    ]);

    const connectionHealth = this.buildConnectionHealth(connectionGroups);
    const automation = this.buildAutomationMetrics(
      completedJobsLast24h,
      retryingJobsLast24h,
      failedJobsLast24h
    );
    const provisioningSlaCompliance =
      provisioningJobsLast7d === 0
        ? null
        : Number(
            ((provisioningSucceededLast7d / provisioningJobsLast7d) * 100).toFixed(
              1
            )
          );
    const incidents = incidentJobs.map((job) => {
      const occurredAt = job.completedAt ?? job.updatedAt ?? job.createdAt;
      const fallbackMessage = `${job.kind} job failed`;
      let message: string = fallbackMessage;
      if (job.error && typeof job.error === 'object') {
        const payload = job.error as Prisma.JsonObject;
        const rawMessage = payload?.['message'];
        if (typeof rawMessage === 'string') {
          message = rawMessage;
        } else if (rawMessage !== null && rawMessage !== undefined) {
          try {
            message = JSON.stringify(rawMessage);
          } catch {
            message = fallbackMessage;
          }
        }
      }

      return {
        id: job.id,
        status: this.classifyIncidentStatus(occurredAt),
        message,
        occurredAt: occurredAt.toISOString(),
        kind: job.kind
      };
    });

    return {
      totals: {
        tenants: tenantCount,
        connections: connectionCount,
        rules: ruleCount,
        successfulRepostsLast24h
      },
      connectionHealth,
      automation,
      onboarding: {
        newTenantsLast7d,
        invitedUsersLast7d,
        activeUsersLast7d,
        provisioningSlaCompliance
      },
      incidents
    };
  }

  private buildAutomationMetrics(
    completed: number,
    retrying: number,
    failed: number
  ) {
    const total = completed + retrying + failed;
    const toPercentage = (value: number) =>
      total === 0 ? 0 : Number(((value / total) * 100).toFixed(1));

    return {
      completed,
      retrying,
      failed,
      completedPercentage: toPercentage(completed),
      retryingPercentage: toPercentage(retrying),
      failedPercentage: toPercentage(failed)
    };
  }

  private buildConnectionHealth(
    groups: Array<{
      platform: SocialPlatform;
      status: ConnectionStatus;
      _count: { _all: number };
    }>
  ): ConnectionHealthBucket[] {
    const platforms: Record<SocialPlatform, ConnectionHealthBucket> = {
      TIKTOK: { platform: SocialPlatform.TIKTOK, healthy: 0, warning: 0, critical: 0 },
      INSTAGRAM: {
        platform: SocialPlatform.INSTAGRAM,
        healthy: 0,
        warning: 0,
        critical: 0
      },
      YOUTUBE: {
        platform: SocialPlatform.YOUTUBE,
        healthy: 0,
        warning: 0,
        critical: 0
      },
      TWITTER: {
        platform: SocialPlatform.TWITTER,
        healthy: 0,
        warning: 0,
        critical: 0
      }
    };

    for (const group of groups) {
      const bucket = platforms[group.platform];
      if (!bucket) {
        continue;
      }
      const count = group._count._all;
      switch (group.status) {
        case ConnectionStatus.ACTIVE:
          bucket.healthy += count;
          break;
        case ConnectionStatus.EXPIRED:
          bucket.warning += count;
          break;
        case ConnectionStatus.ERROR:
        case ConnectionStatus.REVOKED:
          bucket.critical += count;
          break;
        default:
          bucket.warning += count;
      }
    }

    return Object.values(platforms);
  }

  private classifyIncidentStatus(date: Date): IncidentStatus {
    const ageInMinutes = (Date.now() - date.getTime()) / (1000 * 60);
    if (ageInMinutes <= 60) {
      return 'new';
    }
    if (ageInMinutes <= 360) {
      return 'investigating';
    }
    return 'mitigated';
  }
}
