import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { JobKind } from '@prisma/client';
import { REPOST_QUEUE_PROVIDER } from './queue.constants';

interface EnqueueJobOptions {
  jobId: string;
  kind: JobKind;
  priority?: number;
}

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @Inject(REPOST_QUEUE_PROVIDER)
    private readonly queue: Queue
  ) {}

  async enqueueJob(options: EnqueueJobOptions): Promise<string> {
    const { jobId, kind, priority = 0 } = options;
    this.logger.log(`Enqueuing ${kind} job ${jobId}`);

    const job = await this.queue.add(
      kind,
      {
        processingJobId: jobId,
        kind
      },
      {
        jobId,
        priority
      }
    );

    return job.id ?? jobId;
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
