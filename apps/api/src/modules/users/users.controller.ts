import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UsersService, UserListResult } from './users.service';
import { ListUsersDto } from './dto/list-users.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantScopeGuard } from '../auth/guards/tenant-scope.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/auth.service';

@Controller('users')
@UseGuards(JwtAuthGuard, TenantScopeGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@Query() query: ListUsersDto, @CurrentUser() user: AuthUser): Promise<UserListResult> {
    // Enforce tenant scoping for non-admins
    if (user.role !== 'ADMIN' && (!query.tenantId || query.tenantId !== user.tenantId)) {
      query.tenantId = user.tenantId;
    }
    return this.users.list(query);
  }
}
