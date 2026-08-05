import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { ztteam_getReelsPath, ztteam_getImagesPath } from '../common/ztteam_storage.util';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ZTTeamStorageCleanupCron {
  private readonly logger = new Logger(ZTTeamStorageCleanupCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramService: TelegramService,
  ) {}

  /** Run every day at 02:00 AM */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async ztteam_handleCron() {
    this.logger.log('Starting daily storage cleanup...');
    try {
      /** Fetch retention days from settings */
      const setting = await this.prisma.ztteam_settings.findUnique({ where: { key: 'video_retention_days' } });
      const retentionDays = setting ? parseInt(setting.value, 10) : 7;
      
      if (isNaN(retentionDays) || retentionDays <= 0) {
        this.logger.log('Retention days is invalid or disabled. Skipping cleanup.');
        return;
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      this.logger.log(`Cleaning up files older than ${retentionDays} days (before ${cutoffDate.toISOString()})`);

      let deletedReelsCount = 0;
      let deletedImagesCount = 0;

      /** Cleanup Reels */
      const oldReels = await this.prisma.ztteam_reels.findMany({
        where: {
          created_at: { lt: cutoffDate },
          video_url: { not: 'DELETED' },
        },
      });

      for (const reel of oldReels) {
        const reelDir = ztteam_getReelsPath(reel.id);
        if (fs.existsSync(reelDir)) {
          fs.rmSync(reelDir, { recursive: true, force: true });
        }
        await this.prisma.ztteam_reels.update({
          where: { id: reel.id },
          data: { video_url: 'DELETED' },
        });
        deletedReelsCount++;
      }

      /** Cleanup Images */
      const oldImages = await this.prisma.ztteam_images.findMany({
        where: {
          created_at: { lt: cutoffDate },
          image_url: { not: 'DELETED' },
        },
      });

      for (const image of oldImages) {
        const imageDir = ztteam_getImagesPath(image.id);
        if (fs.existsSync(imageDir)) {
          fs.rmSync(imageDir, { recursive: true, force: true });
        }
        await this.prisma.ztteam_images.update({
          where: { id: image.id },
          data: { image_url: 'DELETED' },
        });
        deletedImagesCount++;
      }

      this.logger.log(`Cleanup complete. Deleted ${deletedReelsCount} reels and ${deletedImagesCount} images.`);
      
      if (deletedReelsCount > 0 || deletedImagesCount > 0) {
        this.telegramService.ztteam_sendMessage(
          `🧹 *[DỌN DẸP Ổ CỨNG ĐỊNH KỲ]*\n\n` +
          `Đã xóa tự động các file cũ hơn ${retentionDays} ngày:\n` +
          `• Video: ${deletedReelsCount} file\n` +
          `• Ảnh: ${deletedImagesCount} file`
        );
      }

    } catch (error: any) {
      this.logger.error(`Storage cleanup failed: ${error.message}`);
      this.telegramService.ztteam_sendMessage(
        `🚨 *[LỖI DỌN DẸP Ổ CỨNG]*\n\n` +
        `• *Lỗi:* ${error.message}`
      );
    }
  }
}
