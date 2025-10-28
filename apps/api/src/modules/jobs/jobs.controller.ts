import { Controller, Get, Query } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsOverviewQueryDto } from './dto/jobs-overview-query.dto';
import { JobsRecentQueryDto } from './dto/jobs-recent-query.dto';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get('overview')
  getOverview(@Query() query: JobsOverviewQueryDto) {
    return this.jobs.getOverview(query);
  }

  @Get('recent')
  getRecent(@Query() query: JobsRecentQueryDto) {
    return this.jobs.listRecent(query);
  }
}
