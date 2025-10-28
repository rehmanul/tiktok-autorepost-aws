import { Injectable, Logger } from '@nestjs/common';
import { JobKind, JobStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { QueueService } from '../queue/queue.service';

interface ScheduleJobInput {
  tenantId: string;
  userId: string;
  kind: JobKind;
  ruleId?: string;
  postLogId?: string;
  sourceConnectionId?: string;
  destinationConnectionId?: string;
  payload?: Prisma.JsonValue;
  priority?: number;
}

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService
  ) {}

  async scheduleJob(input: ScheduleJobInput) {
    const jobRecord = await this.prisma.processingJob.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        ruleId: input.ruleId,
        postLogId: input.postLogId,
        sourceConnectionId: input.sourceConnectionId,
        destinationConnectionId: input.destinationConnectionId,
        kind: input.kind,
        status: JobStatus.PENDING,
        payload: input.payload ?? Prisma.JsonNull,
        priority: input.priority ?? 0
      }
    });

    await this.queueService.enqueueJob({
      jobId: jobRecord.id,
      kind: jobRecord.kind,
      priority: input.priority
    });

    await this.prisma.processingJob.update({
      where: { id: jobRecord.id },
      data: {
        status: JobStatus.SCHEDULED,
        scheduledFor: new Date()
      }
    });

    this.logger.log(
      `Scheduled ${jobRecord.kind} job ${jobRecord.id} for tenant ${jobRecord.tenantId}`
    );

    return jobRecord;
  }

  async getOverview(options: { tenantId?: string } = {}) {
    const now = Date.now();
    const last24Hours = new Date(now - 24 * 60 * 60 * 1000);
    const tenantFilter = options.tenantId ? { tenantId: options.tenantId } : {};

    const [statusGroups, averageDurations, backlogCount] = await Promise.all([
      this.prisma.processingJob.groupBy({
        by: ['status'],
        where: {
          ...tenantFilter,
          updatedAt: {
            gte: last24Hours
          }
        },
        _count: { _all: true }
      }),
      this.prisma.processingJob.findMany({
        where: {
          ...tenantFilter,
          status: JobStatus.SUCCEEDED,
          completedAt: {
            gte: last24Hours
          },
          startedAt: {
            not: null
          }
        },
        orderBy: {
          completedAt: 'desc'
        },
        take: 100,
        select: {
          startedAt: true,
          completedAt: true
        }
      }),
      this.prisma.processingJob.count({
        where: {
          ...tenantFilter,
          status: {
            in: [JobStatus.PENDING, JobStatus.SCHEDULED]
          }
        }
      })
    ]);

    const statusCounts = statusGroups.reduce<Record<JobStatus, number>>((acc, group) => {
      acc[group.status] = group._count._all;
      return acc;
    }, {
      [JobStatus.PENDING]: 0,
      [JobStatus.SCHEDULED]: 0,
      [JobStatus.RUNNING]: 0,
      [JobStatus.SUCCEEDED]: 0,
      [JobStatus.FAILED]: 0,
      [JobStatus.CANCELLED]: 0
    });

    const averageDurationSeconds =
      averageDurations.length === 0
        ? null
        : Math.round(
            averageDurations.reduce((acc, job) => {
              if (!job.startedAt || !job.completedAt) {
                return acc;
              }
              return acc + (job.completedAt.getTime() - job.startedAt.getTime()) / 1000;
            }, 0) / averageDurations.length
          );

    return {
      timeframeStart: last24Hours,
      statusCounts,
      backlogCount,
      averageDurationSeconds
    };
  }

  async listRecent(options: { tenantId?: string; limit?: number } = {}) {
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
    const tenantFilter = options.tenantId ? { tenantId: options.tenantId } : {};

    const jobs = await this.prisma.processingJob.findMany({
      where: tenantFilter,
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      select: {
        id: true,
        tenantId: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        userId: true,
        kind: true,
        status: true,
        attempts: true,
        priority: true,
        scheduledFor: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
        error: true,
        ruleId: true,
        postLogId: true,
        sourceConnectionId: true,
        destinationConnectionId: true
      }
    });

    return jobs.map((job) => ({
      ...job,
      error: this.extractError(job.error)
    }));
  }

  private extractError(error: Prisma.JsonValue | null) {
    if (!error || typeof error !== 'object') {
      return undefined;
    }
    const payload = error as Prisma.JsonObject;
    const rawMessage = payload?.['message'];
    let message: string | undefined;
    if (typeof rawMessage === 'string') {
      message = rawMessage;
    } else if (rawMessage !== null && rawMessage !== undefined) {
      try {
        message = JSON.stringify(rawMessage);
      } catch {
        message = undefined;
      }
    }
    const details = payload?.['details']
      ? (payload['details'] as Record<string, unknown>)
      : undefined;
    return {
      message,
      details
    };
  }
}
