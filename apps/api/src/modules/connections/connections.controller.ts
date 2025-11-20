import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { UpdateConnectionStatusDto } from './dto/update-connection-status.dto';
import { ListConnectionsDto } from './dto/list-connections.dto';
import { ConnectionsOverviewDto } from './dto/connections-overview.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantScopeGuard } from '../auth/guards/tenant-scope.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/auth.service';

@Controller('connections')
@UseGuards(JwtAuthGuard, TenantScopeGuard)
export class ConnectionsController {
  constructor(private readonly connections: ConnectionsService) {}

  @Post()
  create(@Body() dto: CreateConnectionDto, @CurrentUser() user: AuthUser) {
    // Enforce tenant scoping for non-admins
    if (user.role !== 'ADMIN' && dto.tenantId !== user.tenantId) {
      dto.tenantId = user.tenantId;
    }
    if (dto.userId !== user.id && user.role !== 'ADMIN') {
      dto.userId = user.id;
    }
    return this.connections.create(dto);
  }

  @Get('overview')
  overview(@Query() query: ConnectionsOverviewDto, @CurrentUser() user: AuthUser) {
    // Enforce tenant scoping
    if (user.role !== 'ADMIN' && (!query.tenantId || query.tenantId !== user.tenantId)) {
      query.tenantId = user.tenantId;
    }
    return this.connections.overview(query);
  }

  @Get()
  list(@Query() query: ListConnectionsDto, @CurrentUser() user: AuthUser) {
    // Enforce tenant scoping
    if (user.role !== 'ADMIN' && (!query.tenantId || query.tenantId !== user.tenantId)) {
      query.tenantId = user.tenantId;
    }
    if (user.role !== 'ADMIN' && (!query.userId || query.userId !== user.id)) {
      query.userId = user.id;
    }
    return this.connections.list(query);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateConnectionStatusDto) {
    return this.connections.updateStatus(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.connections.delete(id, user);
  }
}
