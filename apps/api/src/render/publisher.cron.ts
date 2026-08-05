import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ZTTeamFacebookService } from '../facebook/facebook.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as path from 'path';
import * as fs from 'fs';
import { ztteam_getReelsPath } from '../common/ztteam_storage.util';
import { TelegramService } from '../telegram/telegram.service';

@Injectable()
export class ZTTeamPublisherCron implements OnApplicationBootstrap {
  private readonly logger = new Logger(ZTTeamPublisherCron.name);
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly facebookService: ZTTeamFacebookService,
    private readonly eventEmitter: EventEmitter2,
    private readonly telegramService: TelegramService,
  ) { }

  onApplicationBootstrap() {
    this.logger.log('Application started, triggering initial publisher cron...');
    this.ztteam_handleCron();
  }

  @Cron(CronExpression.EVERY_MINUTE) /** Run every minute for testing */
  async ztteam_handleCron() {
    if (this.isRunning) {
      this.logger.warn('Publisher cron is already running, skipping this tick');
      return;
    }
    this.isRunning = true;
    this.logger.log('Starting Auto-Publisher Cron...');

    try {
      /** Find reels that are COMPLETED but not posted, process oldest first */
      const reels = await this.prisma.ztteam_reels.findMany({
        where: {
          status: 'COMPLETED',
          is_posted: false,
        },
        include: { page: { include: { fb_account: true } } },
        orderBy: { created_at: 'asc' },
        take: 100,
      });

      const now = new Date();
      const postedInThisTick = new Set<string>();

      for (const reel of reels) {
        if (!reel.page) continue;

        /** KHÓA BỘ NHỚ: Đảm bảo vòng lặp chỉ đăng 1 video cho 1 Page trong 1 phút */
        if (postedInThisTick.has(reel.page_id)) continue;

        const { schedule_mode, schedule_fixed_times, schedule_immediate_gap_minutes } = reel.page;
        let shouldPublish = false;

        /** KHÓA DATABASE: Lấy thời gian đăng của video gần nhất CỦA PAGE NÀY */
        const lastPostedReel = await this.prisma.ztteam_reels.findFirst({
          where: { page_id: reel.page_id, status: 'POSTED' },
          orderBy: { updated_at: 'desc' }
        });
        const lastPostedImage = await this.prisma.ztteam_images.findFirst({
          where: { page_id: reel.page_id, is_posted: true },
          orderBy: { updated_at: 'desc' }
        });

        let lastPostTime = null;
        let lastPostType = null;
        if (lastPostedReel) {
          lastPostTime = lastPostedReel.posted_at ? new Date(lastPostedReel.posted_at) : new Date(lastPostedReel.updated_at);
          lastPostType = 'reel';
        }
        if (lastPostedImage && lastPostedImage.posted_at) {
          if (!lastPostTime || lastPostedImage.posted_at > lastPostTime) {
            lastPostTime = lastPostedImage.posted_at;
            lastPostType = 'image';
          }
        }

        const diffMinutesFromLastPost = lastPostTime ? Math.floor((now.getTime() - lastPostTime.getTime()) / 60000) : Infinity;

        if (reel.page.post_format === 'mixed' && lastPostType === 'reel') {
          /** Kiểm tra xem hiện có Ảnh nào đang sẵn sàng để đăng xen kẽ không */
          const pendingImageCount = await this.prisma.ztteam_images.count({
            where: {
              page_id: reel.page_id,
              status: 'COMPLETED',
              is_posted: false,
            },
          });

          if (pendingImageCount > 0) {
            this.logger.log(`Skipping reel ${reel.id} because mixed mode is waiting for an Image to be posted.`);
            continue;
          } else {
            this.logger.log(`Mixed mode: No pending images in queue for page ${reel.page.name}, proceeding with Reel.`);
          }
        }

        if (schedule_mode === 'fixed') {
          if (schedule_fixed_times && Array.isArray(schedule_fixed_times)) {
            for (const time of schedule_fixed_times as string[]) {
              const [h, m] = time.split(':').map(Number);
              const fixedTimeMinutes = h * 60 + m;
              const currentMinutes = now.getHours() * 60 + now.getMinutes();

              /** Nếu giờ hiện tại nằm trong cửa sổ 5 phút của khung giờ anh đã cài */
              if (currentMinutes >= fixedTimeMinutes && currentMinutes < fixedTimeMinutes + 5) {
                /** Nếu vừa có 1 video đăng cách đây chưa tới 10 phút -> Khung giờ này ĐÃ DÙNG! Bỏ qua! */
                if (diffMinutesFromLastPost < 10) {
                  this.logger.log(`Skipping reel ${reel.id}: A video was already posted ${diffMinutesFromLastPost} mins ago for this time slot.`);
                  break;
                }
                shouldPublish = true;
                break;
              }
            }
          }
        } else {
          /** immediate or gap mode */
          const gapMinutes = schedule_immediate_gap_minutes || 0;

          if (!lastPostTime) {
            shouldPublish = true;
          } else {
            if (diffMinutesFromLastPost >= gapMinutes) {
              shouldPublish = true;
            } else {
              this.logger.log(`Skipping reel ${reel.id} due to gap setting (${diffMinutesFromLastPost}/${gapMinutes} mins)`);
            }
          }
        }

        if (shouldPublish) {
          try {
            await this.ztteam_publishReel(reel);
            postedInThisTick.add(reel.page_id);
          } catch (error: any) {
            this.logger.error(`Failed to auto-publish reel ${reel.id}: ${error.message}`);
            await this.prisma.ztteam_reels.update({
              where: { id: reel.id },
              data: {
                status: 'FAILED',
                error_log: `Lỗi đăng bài lên Facebook: ${error.message}`
              }
            });
            this.telegramService.ztteam_sendMessage(
              `🚨 *[LỖI TỰ ĐỘNG ĐĂNG VIDEO]*\n\n` +
              `• *Fanpage:* ${reel.page?.name || 'Không rõ'}\n` +
              `• *Video:* ${reel.wp_post_title || 'Không rõ'}\n` +
              `• *Lỗi:* ${error.message}`
            );
          }
        }
      }
    } catch (error: any) {
      this.logger.error(`Publisher cron failed: ${error.message}`);
    } finally {
      this.isRunning = false;
      this.logger.log('Auto-Publisher Cron finished.');
    }
  }

  private async ztteam_publishReel(reel: any) {
    this.logger.log(`Auto-publishing reel ${reel.id} to page ${reel.page.name}...`);

    const videoPath = path.join(process.cwd(), 'storage', 'reels', reel.id, 'output.mp4');

    if (!fs.existsSync(videoPath)) {
      throw new Error('File video không tồn tại trên server');
    }

    let description = reel.ai_caption || reel.wp_post_title || '';

    /** Clean up any old tracking links that might have been baked into the database */
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

    const utmMedium = slugify(reel.page?.fb_account?.name || 'account');
    const utmCampaign = slugify(reel.page?.name || 'page');
    const trackingLink = reel.wp_post_url ? `${reel.wp_post_url}${reel.wp_post_url.includes('?') ? '&' : '?'}utm_source=reel&utm_medium=${utmMedium}&utm_campaign=${utmCampaign}` : '';

    if (reel.page.add_link_to_caption && reel.wp_post_url) {
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
      reel.page.fb_page_id,
      videoPath,
      description
    );

    if (reel.page.add_link_to_comment && reel.wp_post_url && response.id) {
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
          reel.page.fb_page_id,
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
    this.logger.log(`Reel ${reel.id} successfully auto-published`);
  }
}
