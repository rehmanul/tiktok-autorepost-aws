import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { RulesService } from './rules.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { ListRulesDto } from './dto/list-rules.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantScopeGuard } from '../auth/guards/tenant-scope.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/auth.service';

@Controller('rules')
@UseGuards(JwtAuthGuard, TenantScopeGuard)
export class RulesController {
  constructor(private readonly rules: RulesService) {}

  @Post()
  create(@Body() dto: CreateRuleDto, @CurrentUser() user: AuthUser) {
    // Enforce tenant scoping
    if (user.role !== 'ADMIN' && dto.tenantId !== user.tenantId) {
      dto.tenantId = user.tenantId;
    }
    if (dto.userId !== user.id && user.role !== 'ADMIN') {
      dto.userId = user.id;
    }
    return this.rules.create(dto);
  }

  @Get()
  list(@Query() query: ListRulesDto, @CurrentUser() user: AuthUser) {
    // Enforce tenant scoping
    if (user.role !== 'ADMIN' && (!query.tenantId || query.tenantId !== user.tenantId)) {
      query.tenantId = user.tenantId;
    }
    if (user.role !== 'ADMIN' && (!query.userId || query.userId !== user.id)) {
      query.userId = user.id;
    }
    return this.rules.list(query);
  }
}
