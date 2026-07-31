import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ZTTeamSettingsService {
  private readonly logger = new Logger(ZTTeamSettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async ztteam_getSettings() {
    const records = await this.prisma.ztteam_settings.findMany();
    const settings: Record<string, string> = {};
    for (const r of records) {
      settings[r.key] = r.value;
    }
    return settings;
  }

  async ztteam_updateSettings(data: Record<string, string>) {
    const keys = Object.keys(data);
    for (const key of keys) {
      await this.prisma.ztteam_settings.upsert({
        where: { key },
        update: { value: data[key] },
        create: { key, value: data[key] },
      });
    }
    return { success: true };
  }
}
