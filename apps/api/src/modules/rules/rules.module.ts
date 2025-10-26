import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { JobsModule } from '../jobs/jobs.module';
import { RulesService } from './rules.service';
import { RulesController } from './rules.controller';

@Module({
  imports: [DatabaseModule, JobsModule],
  controllers: [RulesController],
  providers: [RulesService],
  exports: [RulesService]
})
export class RulesModule {}
