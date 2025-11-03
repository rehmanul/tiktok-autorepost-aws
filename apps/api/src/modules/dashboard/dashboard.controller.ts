import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardOverviewQueryDto } from './dto/dashboard-overview.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantScopeGuard } from '../auth/guards/tenant-scope.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/auth.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, TenantScopeGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('overview')
  getOverview(@Query() query: DashboardOverviewQueryDto, @CurrentUser() user: AuthUser) {
    // Enforce tenant scoping for non-admins
    if (user.role !== 'ADMIN' && (!query.tenantId || query.tenantId !== user.tenantId)) {
      query.tenantId = user.tenantId;
    }
    return this.dashboard.getOverview(query);
  }
}
