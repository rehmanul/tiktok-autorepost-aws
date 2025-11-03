import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TenantsService, TenantListResult } from './tenants.service';
import { ListTenantsDto } from './dto/list-tenants.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantScopeGuard } from '../auth/guards/tenant-scope.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/auth.service';

@Controller('tenants')
@UseGuards(JwtAuthGuard, TenantScopeGuard)
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get()
  list(@Query() query: ListTenantsDto, @CurrentUser() user: AuthUser): Promise<TenantListResult> {
    // Non-admins can only see their own tenant - pass it separately
    const tenantId = user.role === 'ADMIN' ? undefined : user.tenantId;
    return this.tenants.list(query, tenantId);
  }
}
