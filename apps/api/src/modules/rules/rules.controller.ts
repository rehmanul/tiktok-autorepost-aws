import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { RulesService } from './rules.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { ListRulesDto } from './dto/list-rules.dto';

@Controller('rules')
export class RulesController {
  constructor(private readonly rules: RulesService) {}

  @Post()
  create(@Body() dto: CreateRuleDto) {
    return this.rules.create(dto);
  }

  @Get()
  list(@Query() query: ListRulesDto) {
    return this.rules.list(query);
  }
}
