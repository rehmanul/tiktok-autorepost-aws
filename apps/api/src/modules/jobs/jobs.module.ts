import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { QueueModule } from '../queue/queue.module';
import { JobsService } from './jobs.service';

@Module({
  imports: [DatabaseModule, QueueModule],
  providers: [JobsService],
  exports: [JobsService]
})
export class JobsModule {}
