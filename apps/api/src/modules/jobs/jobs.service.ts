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
}
