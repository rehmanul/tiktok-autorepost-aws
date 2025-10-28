import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { UpdateConnectionStatusDto } from './dto/update-connection-status.dto';
import { ListConnectionsDto } from './dto/list-connections.dto';
import { ConnectionsOverviewDto } from './dto/connections-overview.dto';

@Controller('connections')
export class ConnectionsController {
  constructor(private readonly connections: ConnectionsService) {}

  @Post()
  create(@Body() dto: CreateConnectionDto) {
    return this.connections.create(dto);
  }

  @Get('overview')
  overview(@Query() query: ConnectionsOverviewDto) {
    return this.connections.overview(query);
  }

  @Get()
  list(@Query() query: ListConnectionsDto) {
    return this.connections.list(query);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateConnectionStatusDto) {
    return this.connections.updateStatus(id, dto);
  }
}
