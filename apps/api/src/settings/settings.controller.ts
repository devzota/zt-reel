import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ZTTeamSettingsService } from './settings.service';
import { ZTTeamAuthGuard } from '../auth/auth.guard';

@Controller('settings')
@UseGuards(ZTTeamAuthGuard)
export class ZTTeamSettingsController {
  constructor(private readonly settingsService: ZTTeamSettingsService) {}

  @Get()
  async ztteam_getSettings() {
    return this.settingsService.ztteam_getSettings();
  }

  @Put()
  async ztteam_updateSettings(@Body() data: any) {
    return this.settingsService.ztteam_updateSettings(data);
  }
}
