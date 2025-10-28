import { Controller, Get, Query } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { ListTenantsDto } from './dto/list-tenants.dto';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get()
  list(@Query() query: ListTenantsDto) {
    return this.tenants.list(query);
  }
}
