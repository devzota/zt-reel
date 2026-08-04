import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ZTTeamFacebookService } from '../facebook/facebook.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as path from 'path';
import * as fs from 'fs';
import { ztteam_getImagesPath } from '../common/ztteam_storage.util';

@Injectable()
export class ZTTeamImagePublisherCron implements OnApplicationBootstrap {
  private readonly logger = new Logger(ZTTeamImagePublisherCron.name);
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly facebookService: ZTTeamFacebookService,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  onApplicationBootstrap() {
    if (process.env.ENABLE_AUTO_CRON === 'false') {
      this.logger.log('Auto-Image Publisher Cron is disabled via ENABLE_AUTO_CRON=false');
      return;
    }
    this.logger.log('Application started, triggering initial image publisher cron...');
    this.ztteam_handleCron();
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async ztteam_handleCron() {
    if (process.env.ENABLE_AUTO_CRON === 'false') {
      return;
    }
    if (this.isRunning) {
      this.logger.warn('Image Publisher cron is already running, skipping this tick');
      return;
    }
    this.isRunning = true;
    this.logger.log('Starting Auto-Image Publisher Cron...');

    try {
      const images = await this.prisma.ztteam_images.findMany({
        where: {
          status: 'COMPLETED',
          is_posted: false,
        },
        include: { page: { include: { fb_account: true } } },
        orderBy: { created_at: 'asc' },
        take: 100,
      });

      if (images.length === 0) {
        return;
      }

      const imagesByPage = new Map<string, any[]>();
      for (const image of images) {
        if (!imagesByPage.has(image.page_id)) {
          imagesByPage.set(image.page_id, []);
        }
        imagesByPage.get(image.page_id)!.push(image);
      }

      for (const [pageId, pageImages] of imagesByPage.entries()) {
        const page = pageImages[0].page;

        const lastPostedReel = await this.prisma.ztteam_reels.findFirst({
          where: { page_id: pageId, status: 'POSTED' },
          orderBy: { updated_at: 'desc' }
        });
        const lastPostedImage = await this.prisma.ztteam_images.findFirst({
          where: { page_id: pageId, is_posted: true },
          orderBy: { posted_at: 'desc' }
        });

        let lastPostTime = null;
        let lastPostType = null;
        if (lastPostedReel) {
           lastPostTime = new Date(lastPostedReel.updated_at);
           lastPostType = 'reel';
        }
        if (lastPostedImage && lastPostedImage.posted_at) {
           if (!lastPostTime || lastPostedImage.posted_at > lastPostTime) {
              lastPostTime = lastPostedImage.posted_at;
              lastPostType = 'image';
           }
        }

        if (page.post_format === 'mixed' && lastPostType === 'image') {
          /** Kiểm tra xem hiện có Reel nào đang sẵn sàng để đăng xen kẽ không */
          const pendingReelCount = await this.prisma.ztteam_reels.count({
            where: {
              page_id: page.id,
              status: 'COMPLETED',
              is_posted: false,
            },
          });

          if (pendingReelCount > 0) {
            this.logger.log(`Skipping image ${pageImages[0].id} because mixed mode is waiting for a Reel to be posted.`);
            continue;
          } else {
            this.logger.log(`Mixed mode: No pending reels in queue for page ${page.name}, proceeding with Image.`);
          }
        }

        const now = new Date();

        if (page.schedule_mode === 'fixed') {
          if (!page.schedule_fixed_times || page.schedule_fixed_times.length === 0) {
            continue;
          }
          const currentHour = now.getHours().toString().padStart(2, '0');
          const currentMinute = now.getMinutes().toString().padStart(2, '0');
          const currentTimeStr = `${currentHour}:${currentMinute}`;

          if (page.schedule_fixed_times.includes(currentTimeStr)) {
            if (lastPostTime) {
              const diffMinutes = (now.getTime() - lastPostTime.getTime()) / 60000;
              if (diffMinutes < 5) {
                continue;
              }
            }
            await this.ztteam_postImage(pageImages[0], page);
          }
        } else if (page.schedule_mode === 'immediate') {
          const gapMinutes = page.schedule_immediate_gap_minutes || 60;
          
          if (!lastPostTime) {
            await this.ztteam_postImage(pageImages[0], page);
          } else {
            const diffMinutes = (now.getTime() - lastPostTime.getTime()) / 60000;
            if (diffMinutes >= gapMinutes) {
              await this.ztteam_postImage(pageImages[0], page);
            }
          }
        }
      }
    } catch (error: any) {
      this.logger.error(`Image Publisher cron failed: ${error.message}`);
    } finally {
      this.isRunning = false;
      this.logger.log('Auto-Image Publisher Cron finished.');
    }
  }

  private async ztteam_postImage(image: any, page: any) {
    this.logger.log(`Publishing image ${image.id} to page ${page.name}...`);
    
    try {
      const absoluteImagePath = ztteam_getImagesPath(image.id, 'output.png');
      
      if (!fs.existsSync(absoluteImagePath)) {
        this.logger.warn(`File ảnh không tồn tại trên server: ${absoluteImagePath}. Đánh dấu FAILED để không làm nghẽn hàng đợi.`);
        await this.prisma.ztteam_images.update({
          where: { id: image.id },
          data: {
            status: 'FAILED',
            error_log: 'File ảnh không tồn tại trên máy chủ (được tạo từ môi trường khác hoặc đã bị xóa)',
          }
        });
        return;
      }

      let caption = image.ai_caption || image.wp_post_title;
      if (page.add_link_to_caption && image.wp_post_url) {
        caption += `\n\nXem chi tiết: ${image.wp_post_url}`;
      }

      const fbPostId = await this.facebookService.ztteam_publishPhoto(
        page.fb_page_id,
        absoluteImagePath,
        caption
      );

      await this.prisma.ztteam_images.update({
        where: { id: image.id },
        data: {
          is_posted: true,
          posted_at: new Date(),
          fb_post_id: fbPostId,
          status: 'POSTED'
        }
      });

      this.logger.log(`Successfully published image ${image.id} to page ${page.name}, Post ID: ${fbPostId}`);
      this.eventEmitter.emit('image.posted', { imageId: image.id, pageId: page.id });

    } catch (error: any) {
      this.logger.error(`Failed to publish image ${image.id} to page ${page.name}: ${error.message}`);
      await this.prisma.ztteam_images.update({
        where: { id: image.id },
        data: {
          error_log: error.message || 'Lỗi khi đăng ảnh lên Facebook',
        }
      });
    }
  }
}
