import { Controller, Get, Query } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { ListAuditEventsDto } from './dto/list-audit-events.dto';

@Controller('activity')
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  @Get('audit')
  listAudit(@Query() query: ListAuditEventsDto) {
    return this.activity.listAuditEvents(query);
  }
}
