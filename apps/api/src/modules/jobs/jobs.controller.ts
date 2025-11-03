import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsOverviewQueryDto } from './dto/jobs-overview-query.dto';
import { JobsRecentQueryDto } from './dto/jobs-recent-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantScopeGuard } from '../auth/guards/tenant-scope.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/auth.service';

@Controller('jobs')
@UseGuards(JwtAuthGuard, TenantScopeGuard)
export class JobsController {
  constructor(private readonly jobs: JobsService) { }

  @Get('overview')
  getOverview(@Query() query: JobsOverviewQueryDto, @CurrentUser() user: AuthUser) {
    // Enforce tenant scoping for non-admins
    if (user.role !== 'ADMIN' && (!query.tenantId || query.tenantId !== user.tenantId)) {
      query.tenantId = user.tenantId;
    }
    return this.jobs.getOverview(query);
  }

  @Get('recent')
  getRecent(@Query() query: JobsRecentQueryDto, @CurrentUser() user: AuthUser) {
    // Enforce tenant scoping for non-admins
    if (user.role !== 'ADMIN' && (!query.tenantId || query.tenantId !== user.tenantId)) {
      query.tenantId = user.tenantId;
    }
    return this.jobs.listRecent(query);
  }
}
