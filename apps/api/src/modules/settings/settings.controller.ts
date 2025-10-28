import { Controller, Get } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('system')
  getSystemConfig() {
    return this.settings.getSystemConfig();
  }
}
