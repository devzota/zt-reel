import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ZTTeamFacebookService } from '../facebook/facebook.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as fs from 'fs';
import { ztteam_getReelsPath, ztteam_getImagesPath } from '../common/ztteam_storage.util';
import { TelegramService } from '../telegram/telegram.service';

@Injectable()
export class ZTTeamPublisherCron {
  private readonly logger = new Logger(ZTTeamPublisherCron.name);
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly facebookService: ZTTeamFacebookService,
    private readonly eventEmitter: EventEmitter2,
    private readonly telegramService: TelegramService,
  ) { }

  @Cron(CronExpression.EVERY_MINUTE)
  async ztteam_handleCron() {
    if (process.env.ENABLE_AUTO_CRON === 'false') {
      return;
    }

    if (this.isRunning) {
      this.logger.warn('Publisher cron is already running, skipping this tick');
      return;
    }
    this.isRunning = true;

    try {
      /** 1. Tìm các Reel đã render xong đang chờ đăng (xếp theo thời gian tạo cũ nhất trước) */
      const pendingReels = await this.prisma.ztteam_reels.findMany({
        where: {
          status: 'COMPLETED',
          is_posted: false,
        },
        include: { page: { include: { fb_account: true } } },
        orderBy: { created_at: 'asc' },
      });

      /** 2. Tìm các Ảnh đã tạo xong đang chờ đăng (xếp theo thời gian tạo cũ nhất trước) */
      const pendingImages = await this.prisma.ztteam_images.findMany({
        where: {
          status: 'COMPLETED',
          is_posted: false,
        },
        include: { page: { include: { fb_account: true } } },
        orderBy: { created_at: 'asc' },
      });

      if (pendingReels.length === 0 && pendingImages.length === 0) {
        return;
      }

      /** 3. Tập hợp danh sách các Page có bài chờ đăng */
      const pagesMap = new Map<string, any>();
      for (const reel of pendingReels) {
        if (reel.page && !pagesMap.has(reel.page_id)) {
          pagesMap.set(reel.page_id, reel.page);
        }
      }
      for (const img of pendingImages) {
        if (img.page && !pagesMap.has(img.page_id)) {
          pagesMap.set(img.page_id, img.page);
        }
      }

      const now = new Date();

      /** 4. Duyệt từng Page và kiểm tra khung giờ đăng */
      for (const [pageId, page] of pagesMap.entries()) {
        const { auto_publish_enabled, schedule_mode, schedule_fixed_times, schedule_immediate_gap_minutes, post_format } = page;

        /** Nếu Page đang tắt tự động đăng bài thì bỏ qua */
        if (auto_publish_enabled === false) {
          continue;
        }

        /** Lấy bài đăng gần nhất (Reel hoặc Ảnh) của Page này để tính khoảng cách thời gian */
        const lastPostedReel = await this.prisma.ztteam_reels.findFirst({
          where: { page_id: pageId, is_posted: true },
          orderBy: { updated_at: 'desc' }
        });
        const lastPostedImage = await this.prisma.ztteam_images.findFirst({
          where: { page_id: pageId, is_posted: true },
          orderBy: { updated_at: 'desc' }
        });

        let lastPostTime: Date | null = null;
        let lastPostType: 'reel' | 'image' | null = null;

        if (lastPostedReel) {
          lastPostTime = lastPostedReel.posted_at ? new Date(lastPostedReel.posted_at) : new Date(lastPostedReel.updated_at);
          lastPostType = 'reel';
        }
        if (lastPostedImage) {
          const imageTime = lastPostedImage.posted_at ? new Date(lastPostedImage.posted_at) : new Date(lastPostedImage.updated_at);
          if (!lastPostTime || imageTime > lastPostTime) {
            lastPostTime = imageTime;
            lastPostType = 'image';
          }
        }

        const diffMinutesFromLastPost = lastPostTime ? Math.floor((now.getTime() - lastPostTime.getTime()) / 60000) : Infinity;

        let shouldPublish = false;

        if (schedule_mode === 'fixed') {
          if (schedule_fixed_times && Array.isArray(schedule_fixed_times) && schedule_fixed_times.length > 0) {
            const currentMinutes = now.getHours() * 60 + now.getMinutes();

            for (const time of schedule_fixed_times as string[]) {
              const [h, m] = time.split(':').map(Number);
              const fixedTimeMinutes = h * 60 + m;

              /** Nằm trong khung giờ 5 phút */
              if (currentMinutes >= fixedTimeMinutes && currentMinutes < fixedTimeMinutes + 5) {
                /** Nếu đã đăng cách đây chưa đầy 10 phút -> Khung giờ này đã được xử lý */
                if (diffMinutesFromLastPost < 10) {
                  this.logger.log(`Page ${page.name}: Slot ${time} already served (${diffMinutesFromLastPost}m ago). Skipping.`);
                  break;
                }
                shouldPublish = true;
                break;
              }
            }
          }
        } else {
          /** immediate / gap mode */
          const gapMinutes = schedule_immediate_gap_minutes || 60;
          if (!lastPostTime || diffMinutesFromLastPost >= gapMinutes) {
            shouldPublish = true;
          } else {
            this.logger.log(`Page ${page.name}: Waiting for gap (${diffMinutesFromLastPost}/${gapMinutes}m).`);
          }
        }

        if (!shouldPublish) {
          continue;
        }

        /** 5. Chọn định dạng bài đăng (Reel / Ảnh) phù hợp với cấu hình Page */
        const pagePendingReels = pendingReels.filter(r => r.page_id === pageId);
        const pagePendingImages = pendingImages.filter(i => i.page_id === pageId);

        let chosenType: 'reel' | 'image' | null = null;

        if (post_format === 'image') {
          if (pagePendingImages.length > 0) chosenType = 'image';
        } else if (post_format === 'mixed') {
          if (lastPostType === 'reel') {
            if (pagePendingImages.length > 0) {
              chosenType = 'image';
            } else if (pagePendingReels.length > 0) {
              chosenType = 'reel';
            }
          } else {
            if (pagePendingReels.length > 0) {
              chosenType = 'reel';
            } else if (pagePendingImages.length > 0) {
              chosenType = 'image';
            }
          }
        } else {
          /** default 'reel' */
          if (pagePendingReels.length > 0) chosenType = 'reel';
        }

        /** 6. Tiến hành đăng bài duy nhất cho Page này */
        if (chosenType === 'reel' && pagePendingReels.length > 0) {
          await this.ztteam_publishReel(pagePendingReels[0], page);
        } else if (chosenType === 'image' && pagePendingImages.length > 0) {
          await this.ztteam_publishImage(pagePendingImages[0], page);
        }
      }
    } catch (error: any) {
      this.logger.error(`Unified publisher cron error: ${error.message}`);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Đăng video Reel lên Facebook Page
   */
  private async ztteam_publishReel(reel: any, page: any) {
    this.logger.log(`Auto-publishing reel ${reel.id} to page ${page.name}...`);

    try {
      const videoPath = ztteam_getReelsPath(reel.id, 'output.mp4');

      if (!fs.existsSync(videoPath)) {
        throw new Error('File video không tồn tại trên server');
      }

      let description = reel.ai_caption || reel.wp_post_title || '';

      /** Xóa tracking link cũ nếu có */
      if (description.includes('utm_source=reel')) {
        const parts = description.split(/(👉|🔥|📌|👇|🔗|Read more:)/);
        if (parts.length > 1) {
          description = parts[0].trim();
        } else {
          description = description.split(/\n\n.*utm_source=reel/)[0].trim();
        }
      }

      const slugify = (text: string) => {
        if (!text) return '';
        return text.toString().toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').trim();
      };

      const utmMedium = slugify(page?.fb_account?.name || 'account');
      const utmCampaign = slugify(page?.name || 'page');
      const trackingLink = reel.wp_post_url ? `${reel.wp_post_url}${reel.wp_post_url.includes('?') ? '&' : '?'}utm_source=reel&utm_medium=${utmMedium}&utm_campaign=${utmCampaign}` : '';

      if (page.add_link_to_caption && reel.wp_post_url) {
        const prefixes = [
          '👉 Discover more here:',
          '🔥 Read the full story:',
          '📌 Check out the details:',
          '👇 Full article link:',
          '🔗 Learn more at:'
        ];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        description = `${prefix} ${trackingLink}\n\n${description}`;
      }

      const response = await this.facebookService.ztteam_publishReel(
        page.fb_page_id,
        videoPath,
        description
      );

      if (page.add_link_to_comment && reel.wp_post_url && response.id) {
        try {
          const commentPrefixes = [
            '👉 Discover more here:',
            '🔥 Read the full story:',
            '📌 Check out the details:',
            '👇 Full article link:',
            '🔗 Learn more at:'
          ];
          const commentPrefix = commentPrefixes[Math.floor(Math.random() * commentPrefixes.length)];
          await this.facebookService.ztteam_publishComment(
            page.fb_page_id,
            response.id,
            `${commentPrefix} ${trackingLink}`
          );
        } catch (e: any) {
          this.logger.error(`Failed to post comment for reel ${reel.id}: ${e.message}`);
        }
      }

      await this.prisma.ztteam_reels.update({
        where: { id: reel.id },
        data: {
          status: 'POSTED',
          is_posted: true,
          posted_at: new Date(),
          fb_post_id: response.id
        }
      });

      this.eventEmitter.emit('reel.updated', { id: reel.id, status: 'POSTED', fb_post_id: response.id });
      this.logger.log(`Reel ${reel.id} successfully auto-published to page ${page.name}`);
    } catch (error: any) {
      const currentRetries = (reel.post_retry_count || 0) + 1;
      this.logger.error(`Failed to auto-publish reel ${reel.id} (Attempt ${currentRetries}/3): ${error.message}`);

      if (currentRetries < 3) {
        /** Giữ COMPLETED để tự động thử lại ở khung giờ tiếp theo */
        await this.prisma.ztteam_reels.update({
          where: { id: reel.id },
          data: {
            post_retry_count: currentRetries,
            error_log: `Lần thử ${currentRetries}/3 thất bại: ${error.message}`
          }
        });
        this.logger.log(`Reel ${reel.id} kept in COMPLETED status for next time slot retry (Attempt ${currentRetries}/3)`);
      } else {
        /** Đã thử 3 lần thất bại -> đánh dấu FAILED */
        await this.prisma.ztteam_reels.update({
          where: { id: reel.id },
          data: {
            status: 'FAILED',
            post_retry_count: currentRetries,
            error_log: `Lỗi đăng bài sau 3 lần thử: ${error.message}`
          }
        });

        this.telegramService.ztteam_sendMessage(
          `🚨 *[LỖI TỰ ĐỘNG ĐĂNG VIDEO - ĐÃ THỬ 3 LẦN]*\n\n` +
          `• *Fanpage:* ${page.name || 'Không rõ'}\n` +
          `• *Video:* ${reel.wp_post_title || 'Không rõ'}\n` +
          `• *Lỗi:* ${error.message}`
        );
      }
    }
  }

  /**
   * Đăng bài ảnh lên Facebook Page
   */
  private async ztteam_publishImage(image: any, page: any) {
    this.logger.log(`Auto-publishing image ${image.id} to page ${page.name}...`);

    try {
      const absoluteImagePath = ztteam_getImagesPath(image.id, 'output.png');

      if (!fs.existsSync(absoluteImagePath)) {
        this.logger.warn(`File ảnh không tồn tại trên server: ${absoluteImagePath}`);
        await this.prisma.ztteam_images.update({
          where: { id: image.id },
          data: {
            status: 'FAILED',
            error_log: 'File ảnh không tồn tại trên máy chủ (được tạo từ môi trường khác hoặc đã bị xóa)',
          }
        });
        return;
      }

      let caption = image.ai_caption || image.wp_post_title || '';

      const slugify = (text: string) => {
        if (!text) return '';
        return text.toString().toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').trim();
      };

      const utmMedium = slugify(page?.fb_account?.name || 'account');
      const utmCampaign = slugify(page?.name || 'page');
      const trackingLink = image.wp_post_url ? `${image.wp_post_url}${image.wp_post_url.includes('?') ? '&' : '?'}utm_source=image&utm_medium=${utmMedium}&utm_campaign=${utmCampaign}` : '';

      if (page.add_link_to_caption && image.wp_post_url) {
        const prefixes = [
          '👉 Discover more here:',
          '🔥 Read the full story:',
          '📌 Check out the details:',
          '👇 Full article link:',
          '🔗 Learn more at:'
        ];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        caption = `${prefix} ${trackingLink}\n\n${caption}`;
      }

      const fbPostId = await this.facebookService.ztteam_publishPhoto(
        page.fb_page_id,
        absoluteImagePath,
        caption
      );

      if (page.add_link_to_comment && image.wp_post_url && fbPostId) {
        try {
          const commentPrefixes = [
            '👉 Discover more here:',
            '🔥 Read the full story:',
            '📌 Check out the details:',
            '👇 Full article link:',
            '🔗 Learn more at:'
          ];
          const commentPrefix = commentPrefixes[Math.floor(Math.random() * commentPrefixes.length)];
          const commentText = image.ai_first_comment 
            ? `${image.ai_first_comment}\n\n${commentPrefix} ${trackingLink}`
            : `${commentPrefix} ${trackingLink}`;
          await this.facebookService.ztteam_publishComment(page.fb_page_id, fbPostId, commentText);
        } catch (e: any) {
          this.logger.error(`Failed to post comment for image ${image.id}: ${e.message}`);
        }
      }

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
      const currentRetries = (image.post_retry_count || 0) + 1;
      this.logger.error(`Failed to auto-publish image ${image.id} (Attempt ${currentRetries}/3): ${error.message}`);

      if (currentRetries < 3) {
        await this.prisma.ztteam_images.update({
          where: { id: image.id },
          data: {
            post_retry_count: currentRetries,
            error_log: `Lần thử ${currentRetries}/3 thất bại: ${error.message}`
          }
        });
        this.logger.log(`Image ${image.id} kept in COMPLETED status for next time slot retry (Attempt ${currentRetries}/3)`);
      } else {
        await this.prisma.ztteam_images.update({
          where: { id: image.id },
          data: {
            status: 'FAILED',
            post_retry_count: currentRetries,
            error_log: `Lỗi đăng ảnh sau 3 lần thử: ${error.message}`
          }
        });

        this.telegramService.ztteam_sendMessage(
          `🚨 *[LỖI TỰ ĐỘNG ĐĂNG ẢNH - ĐÃ THỬ 3 LẦN]*\n\n` +
          `• *Fanpage:* ${page.name || 'Không rõ'}\n` +
          `• *Ảnh:* ${image.wp_post_title || 'Không rõ'}\n` +
          `• *Lỗi:* ${error.message}`
        );
      }
    }
  }
}
