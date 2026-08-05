import { Processor, Worker, Job } from 'bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import IORedis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { ZTTeamAIService } from '../ai/ai.service';
import { ZTTeamPuppeteerService } from '../media/puppeteer.service';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ztteam_getImagesPath } from '../common/ztteam_storage.util';
import { TelegramService } from '../telegram/telegram.service';

export interface ZTTeamImageJobData {
  imageId: string;
  pageId: string;
  wpPostId: string;
  templateId: string;
}

@Injectable()
export class ZTTeamImageProcessor implements OnModuleInit {
  private readonly logger = new Logger('ZTTeamImageProcessor');
  private worker: Worker;
  private connection: IORedis;
  private queue: any;
  private readonly storageRoot = ztteam_getImagesPath();

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: ZTTeamAIService,
    private readonly puppeteerService: ZTTeamPuppeteerService,
    private readonly eventEmitter: EventEmitter2,
    private readonly telegramService: TelegramService
  ) {}

  onModuleInit() {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
    this.connection = new IORedis(redisPort, redisHost, { maxRetriesPerRequest: null });
    const { Queue } = require('bullmq');
    this.queue = new Queue('ztteam-image', { connection: this.connection });

    if (!fs.existsSync(this.storageRoot)) {
      fs.mkdirSync(this.storageRoot, { recursive: true });
    }

    this.worker = new Worker(
      'ztteam-image',
      async (job: Job<ZTTeamImageJobData>) => {
        return this.ztteam_processImageJob(job);
      },
      {
        connection: this.connection,
        concurrency: parseInt(process.env.RENDER_CONCURRENCY || '1', 10),
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`Image Job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Image Job ${job?.id} failed: ${err.message}`);
    });

    this.logger.log('Image worker initialized and listening for jobs');
  }

  async ztteam_addJob(data: ZTTeamImageJobData): Promise<string> {
    const job = await this.queue.add('render-image', data, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 5000 },
    });
    this.logger.log(`Job enqueued: ${job.id} for image ${data.imageId}`);
    return job.id || '';
  }

  private async ztteam_updateImage(id: string, data: any) {
    const updated = await this.prisma.ztteam_images.update({ where: { id }, data });
    this.eventEmitter.emit('image.updated', updated);
    return updated;
  }

  private async ztteam_processImageJob(job: Job<ZTTeamImageJobData>): Promise<void> {
    const { imageId, pageId, wpPostId, templateId } = job.data;
    this.logger.log(`===== START IMAGE RENDER: image=${imageId} =====`);

    await this.ztteam_updateImage(imageId, { status: 'RENDERING', error_log: null });

    const workDir = path.join(this.storageRoot, imageId);
    fs.mkdirSync(workDir, { recursive: true });

    try {
      /** ========== STEP 1: Fetch data ========== */
      const { page, template, post } = await this.ztteam_step1_fetchData(pageId, wpPostId, templateId);

      /** ========== STEP 1.5: Generate AI Caption & Comment ========== */
      const { caption, comment } = await this.aiService.ztteam_generateImageContent(
        post.content,
        page.ai_tone,
        page.ai_custom_prompt,
      );
      await this.ztteam_updateImage(imageId, { ai_caption: caption, ai_first_comment: comment });

      /** ========== STEP 2: Download Images ========== */
      const downloadedImages = await this.ztteam_step2_downloadImages(post.images, workDir);

      /** ========== STEP 3: Puppeteer render ========== */
      const outputPath = await this.ztteam_step3_renderOverlay(template, page, post, downloadedImages, workDir);

      /** ========== STEP 4: Save result ========== */
      const imageUrl = `/storage/images/${imageId}/output.png`;

      await this.ztteam_updateImage(imageId, {
        status: 'COMPLETED',
        image_url: imageUrl,
      });

      this.logger.log(`===== IMAGE RENDER COMPLETE: image=${imageId} =====`);

    } catch (error: any) {
      this.logger.error(`Image render failed for ${imageId}: ${error.message}`);
      await this.ztteam_updateImage(imageId, {
        status: 'FAILED',
        error_log: error.message || 'Unknown error',
      });

      let pageName = 'Không rõ';
      if (imageRecord && imageRecord.page_id) {
        const p = await this.prisma.ztteam_pages.findUnique({ where: { id: imageRecord.page_id } });
        if (p) pageName = p.name;
      }

      this.telegramService.ztteam_sendMessage(
        `🚨 *[LỖI TẠO ẢNH]*\n\n` +
        `• *Fanpage:* ${pageName}\n` +
        `• *Ảnh:* ${imageRecord?.wp_post_title || 'Không rõ'}\n` +
        `• *Lỗi:* ${error.message}`
      );

      throw error;
    }
  }

  private async ztteam_step1_fetchData(pageId: string, wpPostId: string, templateId: string) {
    let page = await this.prisma.ztteam_pages.findUnique({
      where: { id: pageId },
      include: { sources: true, fb_account: true },
    });

    if (!page) throw new Error(`Page ${pageId} not found`);

    const source = page.sources[0];
    if (!source) throw new Error('Fanpage chưa được cấu hình Nguồn bài viết (WordPress) nào trong phần Cài đặt.');

    let post = { content: '', excerpt: '', images: [] as string[], title: '' };
    const site = await this.prisma.ztteam_target_sites.findUnique({
      where: { id: source.target_site_id },
    });

    if (site) {
      try {
        const wpUrl = site.wp_url.replace(/\/$/, '');
        const res = await axios.get(`${wpUrl}/wp-json/wp/v2/posts/${wpPostId}`, { timeout: 15000 });
        const wpPost = res.data;
        post.title = wpPost.title?.rendered || '';
        post.content = (wpPost.content?.rendered || '').replace(/<[^>]+>/g, ' ').trim();
        post.excerpt = (wpPost.excerpt?.rendered || post.content.substring(0, 150) + '...').replace(/<[^>]+>/g, ' ').trim();

        const imgRegex = /<img[^>]+(?:src|data-src)="([^"]+)"/gi;
        let match;
        while ((match = imgRegex.exec(wpPost.content?.rendered || '')) !== null) {
          post.images.push(match[1]);
        }

        if (wpPost.featured_media) {
          try {
            const mediaRes = await axios.get(`${wpUrl}/wp-json/wp/v2/media/${wpPost.featured_media}`, { timeout: 10000 });
            if (mediaRes.data?.source_url) {
              post.images.unshift(mediaRes.data.source_url);
            }
          } catch (e) { }
        }

        /** Lọc trùng lặp ảnh */
        post.images = [...new Set(post.images)];
      } catch (error) {
        throw new Error('Lỗi lấy bài viết từ WP');
      }
    }

    if (post.images.length === 0) {
      post.images.push('https://placehold.co/1080x1080/2563eb/white?text=No+Image');
    }

    let finalTemplateId = templateId;
    if (templateId === 'auto' || templateId === 'default' || !templateId) {
      const imgCount = post.images.length;
      let searchStr = '2';
      if (imgCount === 3) searchStr = '3';
      if (imgCount >= 4) searchStr = '4';

      const foundTemplate = await this.prisma.ztteam_templates.findFirst({
        where: { name: { contains: searchStr }, format: 'image' },
      });
      if (foundTemplate) {
        finalTemplateId = foundTemplate.id;
      }
    }

    const template = await this.prisma.ztteam_templates.findUnique({
      where: { id: finalTemplateId },
    });
    if (!template) throw new Error(`Template ${finalTemplateId} not found`);

    return { page, template, post };
  }

  private async ztteam_step2_downloadImages(imageUrls: string[], workDir: string): Promise<string[]> {
    const localPaths: string[] = [];
    const maxImages = 5; /** Chỉ lấy tối đa 5 ảnh để chèn */
    
    for (let i = 0; i < Math.min(imageUrls.length, maxImages); i++) {
      const imgUrl = imageUrls[i];
      const localPath = path.join(workDir, `img_${i}.jpg`);
      
      try {
        if (imgUrl.startsWith('http')) {
          const response = await axios({ url: imgUrl, responseType: 'stream', timeout: 10000 });
          const writer = fs.createWriteStream(localPath);
          response.data.pipe(writer);
          await new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(undefined));
            writer.on('error', reject);
          });
          /** For base64 usage in Puppeteer, we need file:// protocol or base64 data */
          const base64 = fs.readFileSync(localPath, { encoding: 'base64' });
          const ext = imgUrl.split('.').pop()?.toLowerCase() === 'png' ? 'png' : 'jpeg';
          localPaths.push(`data:image/${ext};base64,${base64}`);
        } else {
          localPaths.push(imgUrl);
        }
      } catch (e) {
        this.logger.warn(`Failed to download image ${imgUrl}`);
      }
    }
    
    /** Padding missing images with placeholders if the template uses them */
    while (localPaths.length < 5) {
      localPaths.push('https://placehold.co/1080x1080/f1f5f9/9ca3af?text=No+Image');
    }
    
    return localPaths;
  }

  private async ztteam_step3_renderOverlay(template: any, page: any, post: any, images: string[], workDir: string): Promise<string> {
    const outputPath = path.join(workDir, 'output.png');
    let finalHtml = template.html_content;
    
    /** Xử lý template thay thế biến */
    finalHtml = finalHtml.replace(/\{\{title\}\}/g, post.title);
    finalHtml = finalHtml.replace(/\{\{excerpt\}\}/g, post.excerpt);
    finalHtml = finalHtml.replace(/\{\{site_name\}\}/g, page.name);
    finalHtml = finalHtml.replace(/\{\{logo_url\}\}/g, page.avatar || '');

    const headerX = template.layout?.header?.x !== undefined ? template.layout.header.x : 40;
    const headerY = template.layout?.header?.y !== undefined ? template.layout.header.y : 850;
    finalHtml = finalHtml.replace(/\{\{layout\.header\.x\}\}/g, String(headerX));
    finalHtml = finalHtml.replace(/\{\{layout\.header\.y\}\}/g, String(headerY));

    const breakingX = template.layout?.breaking?.x !== undefined ? template.layout.breaking.x : 10;
    const breakingY = template.layout?.breaking?.y !== undefined ? template.layout.breaking.y : 10;
    finalHtml = finalHtml.replace(/\{\{layout\.breaking\.x\}\}/g, String(breakingX));
    finalHtml = finalHtml.replace(/\{\{layout\.breaking\.y\}\}/g, String(breakingY));

    const hookX = template.layout?.hook?.x !== undefined ? template.layout.hook.x : 40;
    const hookY = template.layout?.hook?.y !== undefined ? template.layout.hook.y : 950;
    finalHtml = finalHtml.replace(/\{\{layout\.hook\.x\}\}/g, String(hookX));
    finalHtml = finalHtml.replace(/\{\{layout\.hook\.y\}\}/g, String(hookY));

    
    /** Xử lý ẩn hiện phần tử theo layout */
    if (template.layout?.hide_title) {
      finalHtml = finalHtml.replace(/class="header"/g, 'class="header" style="display: none !important;"');
      finalHtml = finalHtml.replace(/class="text-overlay"/g, 'class="text-overlay" style="display: none !important;"');
    }
    if (template.layout?.hide_excerpt) {
      finalHtml = finalHtml.replace(/class="hook"/g, 'class="hook" style="display: none !important;"');
    }
    
    /** Xử lý thay thế URL ảnh */
    for (let i = 0; i < images.length; i++) {
      finalHtml = finalHtml.replace(new RegExp(`\\{\\{image_${i + 1}\\}\\}`, 'g'), images[i]);
    }

    const width = template.layout?.width || 1080;
    const height = template.layout?.height || 1080;
    
    await this.puppeteerService.ztteam_renderOverlay(finalHtml, outputPath, width, height);
    return outputPath;
  }
}
