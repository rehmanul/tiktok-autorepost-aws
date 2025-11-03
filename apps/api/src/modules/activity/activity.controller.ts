import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ActivityService, AuditEventListResult } from './activity.service';
import { ListAuditEventsDto } from './dto/list-audit-events.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantScopeGuard } from '../auth/guards/tenant-scope.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/auth.service';

@Controller('activity')
@UseGuards(JwtAuthGuard, TenantScopeGuard)
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  @Get('audit')
  listAudit(@Query() query: ListAuditEventsDto, @CurrentUser() user: AuthUser): Promise<AuditEventListResult> {
    // Enforce tenant scoping for non-admins
    if (user.role !== 'ADMIN' && (!query.tenantId || query.tenantId !== user.tenantId)) {
      query.tenantId = user.tenantId;
    }
    return this.activity.listAuditEvents(query);
  }
}
