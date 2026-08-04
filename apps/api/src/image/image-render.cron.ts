import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ZTTeamImageProcessor } from './image.processor';
import { ZTTeamWordpressService } from '../wordpress/wordpress.service';

@Injectable()
export class ZTTeamImageRenderCron implements OnApplicationBootstrap {
  private readonly logger = new Logger(ZTTeamImageRenderCron.name);
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly imageProcessor: ZTTeamImageProcessor,
    private readonly wordpressService: ZTTeamWordpressService,
  ) {}

  onApplicationBootstrap() {
    if (process.env.ENABLE_AUTO_CRON === 'false') {
      this.logger.log('Auto-Image Render Cron is disabled via ENABLE_AUTO_CRON=false');
      return;
    }
    this.logger.log('Application started, triggering initial image render cron...');
    this.ztteam_handleCron();
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async ztteam_handleCron() {
    if (process.env.ENABLE_AUTO_CRON === 'false') {
      return;
    }
    if (this.isRunning) {
      this.logger.warn('Image Render cron is already running, skipping this tick');
      return;
    }
    this.isRunning = true;
    this.logger.log('Starting Auto-Image Render Cron...');

    try {
      /** Find all pages that have auto create enabled and format is image */
      const pages = await this.prisma.ztteam_pages.findMany({
        where: { auto_create_enabled: true, post_format: { in: ['image', 'mixed'] } },
        include: { sources: true },
        orderBy: { last_auto_scan_at: 'asc' },
        take: 50,
      });

      for (const page of pages) {
        if (!page.sources || page.sources.length === 0) continue;
        
        try {
          await this.ztteam_processPage(page);
        } catch (error: any) {
          this.logger.error(`Failed to process auto-image for page ${page.id}: ${error.message}`);
        }
      }
    } catch (error: any) {
      this.logger.error(`Image Render cron failed: ${error.message}`);
    } finally {
      this.isRunning = false;
      this.logger.log('Auto-Image Render Cron finished.');
    }
  }

  private async ztteam_processPage(page: any) {
    this.logger.log(`Checking new posts for page: ${page.name}`);
    
    let processedCount = 0;
    const batchSize = page.auto_scan_batch_size || 3;
    const maxAgeDays = page.auto_max_post_age_days || 7;
    const now = new Date();

    const intervalHours = page.auto_scan_interval_hours || 2;
    
    /** Fetch last scan time from settings to decouple from Reel scanner */
    const settingKey = `image_scan_${page.id}`;
    const scanSetting = await this.prisma.ztteam_settings.findUnique({ where: { key: settingKey } });
    const lastScanTime = scanSetting ? new Date(scanSetting.value) : null;
    
    if (lastScanTime) {
      const hoursSinceLastScan = (now.getTime() - lastScanTime.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastScan < intervalHours) {
        this.logger.debug(`Skipping page ${page.name}, interval not reached (${hoursSinceLastScan.toFixed(2)} / ${intervalHours} hours)`);
        return;
      }
    }

    for (const source of page.sources) {
      if (!source.is_active) continue;

      const site = await this.prisma.ztteam_target_sites.findUnique({
        where: { id: source.target_site_id }
      });
      if (!site || site.status !== 'active') continue;

      try {
        const posts = await this.wordpressService.ztteam_getPosts(source.target_site_id, undefined as any, source.target_category_id, source.target_tags);
        
        /** Process oldest first (FIFO) so chronological order is maintained on Fanpage */
        const reversedPosts = [...posts].reverse();

        for (const post of reversedPosts) {
          if (processedCount >= batchSize) break;

          const postDate = new Date(post.date);
          const ageDays = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60 * 24);
          
          if (ageDays > maxAgeDays) {
            continue;
          }

          const history = await this.prisma.ztteam_image_history.findUnique({
            where: { page_id_wp_post_id: { page_id: page.id, wp_post_id: post.id.toString() } }
          });

          if (history) continue;

          const queueCount = await this.prisma.ztteam_images.count({
            where: {
              page_id: page.id,
              status: { in: ['QUEUED', 'RENDERING'] }
            }
          });
          if (queueCount >= (page.auto_queue_limit || 10)) {
            this.logger.log(`Queue limit reached for page ${page.name}`);
            break;
          }

          const image = await this.prisma.ztteam_images.create({
            data: {
              page_id: page.id,
              wp_post_id: post.id.toString(),
              wp_post_title: post.title,
              wp_post_url: post.link,
              template_id: page.default_image_template_id || 'default',
              status: 'QUEUED',
            },
          });

          await this.prisma.ztteam_image_history.upsert({
            where: { page_id_wp_post_id: { page_id: page.id, wp_post_id: post.id.toString() } },
            create: { page_id: page.id, wp_post_id: post.id.toString() },
            update: {},
          });

          await this.imageProcessor.ztteam_addJob({
            imageId: image.id,
            pageId: page.id,
            wpPostId: post.id.toString(),
            templateId: page.default_image_template_id || 'default',
          });

          processedCount++;
        }
      } catch (error: any) {
        this.logger.error(`Failed to fetch posts from site ${site.wp_url}: ${error.message}`);
      }

      if (processedCount >= batchSize) break;
    }

    if (processedCount > 0) {
      const settingKey = `image_scan_${page.id}`;
      await this.prisma.ztteam_settings.upsert({
        where: { key: settingKey },
        create: { key: settingKey, value: new Date().toISOString() },
        update: { value: new Date().toISOString() }
      });
      this.logger.log(`Queued ${processedCount} images for page ${page.name}`);
    }
  }
}
