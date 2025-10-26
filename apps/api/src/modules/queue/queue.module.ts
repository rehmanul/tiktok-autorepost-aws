import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUES } from '@autorepost/common';
import { REPOST_QUEUE_PROVIDER } from './queue.constants';
import { QueueService } from './queue.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REPOST_QUEUE_PROVIDER,
      useFactory: (config: ConfigService) => {
        const redis = config.get<{ url: string; tls: boolean }>('redis');
        const connection = new IORedis(redis?.url ?? 'redis://localhost:6379', {
          tls: redis?.tls ? {} : undefined,
          maxRetriesPerRequest: null
        });

        return new Queue(QUEUES.REPOST_DISPATCH, {
          connection,
          defaultJobOptions: {
            removeOnComplete: 500,
            removeOnFail: 1000,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000
            }
          }
        });
      },
      inject: [ConfigService]
    },
    QueueService
  ],
  exports: [QueueService]
})
export class QueueModule {}
