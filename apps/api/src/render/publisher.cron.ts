import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ZTTeamFacebookService } from '../facebook/facebook.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class ZTTeamPublisherCron implements OnApplicationBootstrap {
  private readonly logger = new Logger(ZTTeamPublisherCron.name);
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly facebookService: ZTTeamFacebookService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

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

      for (const reel of reels) {
        if (!reel.page) continue;
        
        const { schedule_mode, schedule_fixed_times, schedule_immediate_gap_minutes } = reel.page;
        let shouldPublish = false;

        if (schedule_mode === 'fixed') {
          if (schedule_fixed_times && Array.isArray(schedule_fixed_times)) {
            const currentHourMinutes = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            /** Example: if time is 15:05 and fixed time is "15:00", we should allow a buffer */
            for (const time of schedule_fixed_times as string[]) {
              const [h, m] = time.split(':').map(Number);
              const fixedTimeMinutes = h * 60 + m;
              const currentMinutes = now.getHours() * 60 + now.getMinutes();
              /** If current time is within 5 minutes after the fixed time */
              if (currentMinutes >= fixedTimeMinutes && currentMinutes < fixedTimeMinutes + 5) {
                shouldPublish = true;
                break;
              }
            }
          }
        } else {
          /** immediate or gap mode */
          const gapMinutes = schedule_immediate_gap_minutes || 0;
          
          /** Find the last posted reel for this page */
          const lastPostedReel = await this.prisma.ztteam_reels.findFirst({
            where: { page_id: reel.page_id, status: 'POSTED' },
            orderBy: { updated_at: 'desc' }
          });

          if (!lastPostedReel) {
            shouldPublish = true;
          } else {
            const lastPostTime = new Date(lastPostedReel.updated_at);
            const diffMinutes = Math.floor((now.getTime() - lastPostTime.getTime()) / 60000);
            if (diffMinutes >= gapMinutes) {
              shouldPublish = true;
            } else {
              this.logger.log(`Skipping reel ${reel.id} due to gap setting (${diffMinutes}/${gapMinutes} mins)`);
            }
          }
        }

        if (shouldPublish) {
          try {
            await this.ztteam_publishReel(reel);
          } catch (error: any) {
            this.logger.error(`Failed to auto-publish reel ${reel.id}: ${error.message}`);
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
        fb_post_id: response.id 
      }
    });
    
    this.eventEmitter.emit('reel.updated', { id: reel.id, status: 'POSTED', fb_post_id: response.id });
    this.logger.log(`Reel ${reel.id} successfully auto-published`);
  }
}
