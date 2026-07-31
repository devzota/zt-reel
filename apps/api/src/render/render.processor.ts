import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Worker, Queue, Job } from 'bullmq';
import IORedis from 'ioredis';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { ZTTeamAIService } from '../ai/ai.service';
import { ZTTeamTTSService } from '../audio/tts.service';
import { ZTTeamFFmpegService } from '../media/ffmpeg.service';
import { ZTTeamPuppeteerService } from '../media/puppeteer.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

/** Type for the render job payload */
interface ZTTeamRenderJobData {
  reelId: string;
  pageId: string;
  wpPostId: string;
  wpPostTitle: string;
  templateId: string;
}

/**
 * ZTTeamRenderProcessor — BullMQ worker that processes reel rendering jobs.
 * Implements the 6-step pipeline: Fetch → AI Script → TTS → Image Prep → Overlay → FFmpeg Merge
 */
@Injectable()
export class ZTTeamRenderProcessor implements OnModuleInit {
  private readonly logger = new Logger(ZTTeamRenderProcessor.name);
  private queue: Queue;
  private worker: Worker;
  private connection: IORedis;

  /** Storage root for rendered reels */
  private readonly storageRoot = path.join(process.cwd(), 'storage', 'reels');

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: ZTTeamAIService,
    private readonly ttsService: ZTTeamTTSService,
    private readonly puppeteerService: ZTTeamPuppeteerService,
    private readonly ffmpegService: ZTTeamFFmpegService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleInit() {
    /** Initialize Redis connection for BullMQ */
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

    this.connection = new IORedis(redisPort, redisHost, {
      maxRetriesPerRequest: null,
    });

    this.queue = new Queue('ztteam-render', { connection: this.connection });

    /** Create worker with concurrency limit */
    this.worker = new Worker(
      'ztteam-render',
      async (job: Job<ZTTeamRenderJobData>) => {
        return this.ztteam_processRenderJob(job);
      },
      {
        connection: this.connection,
        concurrency: parseInt(process.env.RENDER_CONCURRENCY || '1', 10),
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`Job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.id} failed: ${err.message}`);
    });

    this.logger.log('Render worker initialized and listening for jobs');
  }

  /**
   * Add a new render job to the queue.
   * Creates a reel record in DB first, then enqueues.
   */
  async ztteam_addJob(data: ZTTeamRenderJobData): Promise<string> {
    const job = await this.queue.add('render-reel', data, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 5000 },
    });
    this.logger.log(`Job enqueued: ${job.id} for reel ${data.reelId}`);
    return job.id || '';
  }

  /**
   * Main render pipeline — 6 steps.
   */
  private async ztteam_processRenderJob(job: Job<ZTTeamRenderJobData>): Promise<void> {
    const { reelId, pageId, wpPostId, templateId } = job.data;
    this.logger.log(`===== START RENDER: reel=${reelId} =====`);

    /** Update status to RENDERING */
    await this.ztteam_updateReel(reelId, { status: 'RENDERING', progress: 0 });
    
    /** Fetch reel to get original wp_post_url */
    const reelRecord = await this.prisma.ztteam_reels.findUnique({
      where: { id: reelId }
    });

    /** Create working directory */
    const workDir = path.join(this.storageRoot, reelId);
    fs.mkdirSync(workDir, { recursive: true });

    try {
      /** ========== STEP 1: Fetch data ========== */
      await this.ztteam_updateReel(reelId, { progress: 5 });
      const { page, template, post } = await this.ztteam_step1_fetchData(pageId, wpPostId, templateId);

      /** ========== STEP 2: AI Script + TTS ========== */
      await this.ztteam_updateReel(reelId, { progress: 15 });
      const { script, caption, hook, audioPath, audioDuration, subtitles } = await this.ztteam_step2_aiAndAudio(
        post.content,
        page.ai_tone,
        page.ai_caption_length === 'short' ? 40 : page.ai_caption_length === 'long' ? 80 : 60,
        template.voice_id || 'alloy',
        workDir,
        page.ai_custom_prompt,
        page.voice_speed || 1.0,
      );

      /** Construct UTM tracking link */
      let finalCaption = caption;
      if (reelRecord?.wp_post_url) {
        const slugify = (text: string) => {
          return text.toString().toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').trim();
        };
        const fbAccountName = (page as any).fb_account?.name || 'account';
        const pageName = page.name || 'page';
        const utmMedium = slugify(fbAccountName);
        const utmCampaign = slugify(pageName);
        const separator = reelRecord.wp_post_url.includes('?') ? '&' : '?';
        const trackingLink = `${reelRecord.wp_post_url}${separator}utm_source=reel&utm_medium=${utmMedium}&utm_campaign=${utmCampaign}`;
        finalCaption = caption ? `${caption}\n\nChi tiết bài viết: ${trackingLink}` : `Chi tiết bài viết: ${trackingLink}`;
      }

      await this.ztteam_updateReel(reelId, { ai_script: script, ai_caption: finalCaption, ai_hook: hook, progress: 35 });

      /** ========== STEP 3: Prepare images ========== */
      await this.ztteam_updateReel(reelId, { progress: 45 });
      const videoX = (template.layout as any)?.video?.x ?? 0;
      const videoW = (template.layout as any)?.video?.w ?? 1080;
      const videoH = (template.layout as any)?.video?.h ?? 1080;
      const videoY = template.video_y ?? 0;
      const preparedImages = await this.ztteam_step3_prepareImages(post.images, workDir, videoW, videoH, videoX, videoY);

      /** ========== STEP 4: Puppeteer overlay ========== */
      await this.ztteam_updateReel(reelId, { progress: 55 });
      const overlayPath = await this.ztteam_step4_renderOverlay(template, page, hook || post.title, workDir);

      /** ========== STEP 5: FFmpeg merge ========== */
      await this.ztteam_updateReel(reelId, { progress: 65 });
      const subtitlesY = (template.layout as any)?.subtitles?.y;
      const { videoPath, thumbnailPath } = await this.ztteam_step5_render(
        preparedImages,
        audioPath,
        overlayPath,
        subtitles,
        audioDuration,
        videoX,
        videoY,
        videoW,
        videoH,
        workDir,
        subtitlesY
      );
      await this.ztteam_updateReel(reelId, { progress: 90 });

      /** ========== STEP 6: Save result ========== */
      const videoUrl = `/storage/reels/${reelId}/output.mp4`;
      const thumbnailUrl = `/storage/reels/${reelId}/thumbnail.jpg`;

      await this.ztteam_updateReel(reelId, {
        status: 'COMPLETED',
        progress: 100,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        audio_url: `/storage/reels/${reelId}/voice.mp3`,
        subtitle_data: subtitles,
      });

      this.logger.log(`===== RENDER COMPLETE: reel=${reelId} =====`);

    } catch (error: any) {
      this.logger.error(`Render failed for reel ${reelId}: ${error.message}`);
      await this.ztteam_updateReel(reelId, {
        status: 'FAILED',
        error_log: error.message || 'Unknown error',
      });
      throw error;
    }
  }

  /** Step 1: Fetch page config, template, and WordPress post data */
  private async ztteam_step1_fetchData(pageId: string, wpPostId: string, templateId: string) {
    this.logger.log('Step 1: Fetching data...');

    let page = await this.prisma.ztteam_pages.findUnique({
      where: { id: pageId },
      include: { sources: true, fb_account: true },
    });

    if (!page) {
      /** Fallback for old job payloads that used fb_page_id */
      page = await this.prisma.ztteam_pages.findFirst({
        where: { fb_page_id: pageId },
        include: { sources: true, fb_account: true },
      });
    }

    if (!page) throw new Error(`Page ${pageId} not found`);

    const template = await this.prisma.ztteam_templates.findUnique({
      where: { id: templateId },
    });
    if (!template) throw new Error(`Template ${templateId} not found`);

    /** Removed reel_template_overrides logic as templates are now page-scoped */
    /** Fetch the WordPress post content and images */
    const source = page.sources[0];
    if (!source) {
      throw new Error('Fanpage chưa được cấu hình Nguồn bài viết (WordPress) nào trong phần Cài đặt.');
    }

    let post = { content: '', images: [] as string[], title: '' };

    if (source) {
      const site = await this.prisma.ztteam_target_sites.findUnique({
        where: { id: source.target_site_id },
      });

      if (site) {
        try {
          const wpUrl = site.wp_url.replace(/\/$/, '');
          const res = await axios.get(`${wpUrl}/wp-json/wp/v2/posts/${wpPostId}`, {
            timeout: 15000,
          });
          const wpPost = res.data;
          post.title = wpPost.title?.rendered || '';
          post.content = (wpPost.content?.rendered || '').replace(/<[^>]+>/g, ' ').trim();

          /** Extract images from post content */
          const imgRegex = /<img[^>]+(?:src|data-src)="([^"]+)"/gi;
          let match;
          while ((match = imgRegex.exec(wpPost.content?.rendered || '')) !== null) {
            post.images.push(match[1]);
          }

          /** Also try featured image */
          if (wpPost.featured_media) {
            try {
              const mediaRes = await axios.get(`${wpUrl}/wp-json/wp/v2/media/${wpPost.featured_media}`, { timeout: 10000 });
              if (mediaRes.data?.source_url) {
                post.images.unshift(mediaRes.data.source_url);
              }
            } catch { /** Ignore featured image errors */ }
          }
        } catch (error: any) {
          this.logger.warn(`Failed to fetch WP post: ${error.message}`);
        }
      }
    }

    /** Ensure at least 1 image, max 5 */
    if (post.images.length === 0) {
      throw new Error('Bài viết không có ảnh nào để tạo video');
    }
    post.images = post.images.slice(0, 5);

    this.logger.log(`Step 1 done: ${post.images.length} images, ${post.content.length} chars content`);
    return { page, template, post };
  }

  /** Step 2: Generate AI script, TTS audio, and subtitle timing */
  private async ztteam_step2_aiAndAudio(
    content: string,
    tone: string,
    maxWords: number,
    voiceId: string,
    workDir: string,
    customPrompt?: string | null,
    voiceSpeed: number = 1.0,
  ) {
    this.logger.log('Step 2: AI script + TTS...');

    const aiResult = await this.aiService.ztteam_generateScript(content, tone, maxWords, customPrompt);
    const audioPath = await this.ttsService.ztteam_textToSpeech(aiResult.sub_voice, voiceId, workDir, voiceSpeed);
    const audioDuration = this.ttsService.ztteam_getAudioDuration(audioPath);
    const subtitles = this.aiService.ztteam_generateSubtitles(aiResult.sub_voice, audioDuration);

    this.logger.log(`Step 2 done: script=${aiResult.sub_voice.length} chars, audio=${audioDuration}s, ${subtitles.length} subs`);
    return { script: aiResult.sub_voice, caption: aiResult.caption, hook: aiResult.hook, audioPath, audioDuration, subtitles };
  }

  /** Step 3: Download and prepare images for 9:16 */
  private async ztteam_step3_prepareImages(
    imageUrls: string[],
    workDir: string,
    vw: number = 1080,
    vh: number = 1920,
    vx: number = 0,
    vy: number = 0
  ): Promise<string[]> {
    this.logger.log(`Step 3: Preparing ${imageUrls.length} images for ${vw}x${vh} at ${vx},${vy}...`);

    const preparedImages: string[] = [];

    for (let i = 0; i < imageUrls.length; i++) {
      const rawPath = path.join(workDir, `raw_${i}.jpg`);
      const prepPath = path.join(workDir, `prep_${i}.jpg`);

      try {
        /** Download image */
        const response = await axios.get(imageUrls[i], {
          responseType: 'arraybuffer',
          timeout: 15000,
        });
        fs.writeFileSync(rawPath, response.data);

        /** Prepare for dimensions with blur background */
        await this.ffmpegService.ztteam_prepareImage(rawPath, prepPath, vw, vh, vx, vy);
        preparedImages.push(prepPath);
      } catch (error: any) {
        this.logger.warn(`Image ${i} failed: ${error.message}, skipping`);
      }
    }

    if (preparedImages.length === 0) {
      throw new Error('Không thể xử lý ảnh nào từ bài viết');
    }

    this.logger.log(`Step 3 done: ${preparedImages.length} images prepared`);
    return preparedImages;
  }

  private async ztteam_step4_renderOverlay(template: any, page: any, postTitle: string, workDir: string): Promise<string> {
    this.logger.log('Step 4: Rendering overlay...');

    /** Apply page-specific template overrides (deep merge layout) */
    const overrides = page.reel_template_overrides as any;
    if (overrides && typeof overrides === 'object') {
      template.video_y = overrides.video_y ?? template.video_y;
      template.video_radius = overrides.video_radius ?? template.video_radius;
      if (overrides.layout) {
        template.layout = {
          ...(template.layout as any || {}),
          ...overrides.layout
        };
      }
    }

    /** Merge template with page-specific overrides */
    let htmlContent = template.html_content;
    const layout = template.layout as any;
    const videoY = template.video_y ?? 0;
    const videoRadius = template.video_radius ?? 0;

    this.logger.log(`APPLYING LAYOUT: ${JSON.stringify(layout)}`);

    /** Replace Handlebars placeholders with actual values */
    const videoX = (layout as any)?.video?.x ?? 0;
    const videoW = (layout as any)?.video?.w ?? 1080;
    const videoH = (layout as any)?.video?.h ?? 1080;
    
    htmlContent = htmlContent.replace(/{{video_area\.x}}/g, String(videoX));
    htmlContent = htmlContent.replace(/{{video_area\.y}}/g, String(videoY));
    htmlContent = htmlContent.replace(/{{video_area\.w}}/g, String(videoW));
    htmlContent = htmlContent.replace(/{{video_area\.h}}/g, String(videoH));
    htmlContent = htmlContent.replace(/{{video_area\.radius}}/g, String(videoRadius));
    htmlContent = htmlContent.replace(/{{layout\.breaking\.x}}/g, String(layout?.breaking?.x ?? 40));
    htmlContent = htmlContent.replace(/{{layout\.breaking\.y}}/g, String(layout?.breaking?.y ?? 26));

    htmlContent = htmlContent.replace(/{{layout\.header\.x}}/g, String(layout?.header?.x ?? 84));
    htmlContent = htmlContent.replace(/{{layout\.header\.y}}/g, String(layout?.header?.y ?? 1362));

    htmlContent = htmlContent.replace(/{{layout\.hook\.x}}/g, String(layout?.hook?.x ?? 90));
    htmlContent = htmlContent.replace(/{{layout\.hook\.y}}/g, String(layout?.hook?.y ?? 1450));

    htmlContent = htmlContent.replace(/{{layout\.verdict\.x}}/g, String(layout?.verdict?.x ?? 90));
    htmlContent = htmlContent.replace(/{{layout\.verdict\.y}}/g, String(layout?.verdict?.y ?? 1700));

    /** Handle bg_image_url for Puppeteer */
    let bgImageUrl = layout?.bg_image_url || '';
    if (bgImageUrl && bgImageUrl.startsWith('/storage/')) {
      const absolutePath = path.join(process.cwd(), bgImageUrl);
      try {
        const ext = path.extname(absolutePath).substring(1) || 'png';
        const base64 = require('fs').readFileSync(absolutePath, 'base64');
        bgImageUrl = `data:image/${ext};base64,${base64}`;
      } catch (e: any) {
        this.logger.error(`Failed to read bg image: ${e.message}`);
        bgImageUrl = '';
      }
    }
    htmlContent = htmlContent.replace(/{{layout\.bg_image_url}}/g, bgImageUrl);
    if (!bgImageUrl) {
      htmlContent = htmlContent.replace(/{{#unless layout\.bg_image_url}}display:none;{{\/unless}}/g, 'display:none;');
    } else {
      htmlContent = htmlContent.replace(/{{#unless layout\.bg_image_url}}display:none;{{\/unless}}/g, '');
    }

    htmlContent = htmlContent.replace(/{{{fontFace}}}/g, '');
    
    const avatarHtml = page.avatar ? `<img src="${page.avatar}" style="width:100%;height:100%;object-fit:cover;" />` : '<div style="background:#ddd;width:100%;height:100%"></div>';
    htmlContent = htmlContent.replace(/{{{logoSvg}}}/g, avatarHtml);
    htmlContent = htmlContent.replace(/{{fanpageName}}/g, page.name || 'Fanpage');

    /** Replace color conditionals */
    htmlContent = htmlContent.replace(/{{#if colors\.danger}}{{colors\.danger}}{{else}}{{colors\.primary}}{{\/if}}/g, '#ef4444');
    htmlContent = htmlContent.replace(/{{#if colors\.primary}}{{colors\.primary}}{{else}}#1877f2{{\/if}}/g, '#1877f2');

    /** Insert post title into hook */
    const words = (postTitle || 'Tin nóng hổi vừa thổi vừa xem').split(' ');
    const firstTwo = words.slice(0, 2).join(' ');
    const rest = words.slice(2).join(' ');
    const hookHtml = `<span class="line accent">${firstTwo}</span> <span class="line">${rest}</span>`;
    htmlContent = htmlContent.replace(/{{#each hook}}.*?{{\/each}}/gs, hookHtml);

    const overlayPath = path.join(workDir, 'overlay.png');
    await this.puppeteerService.ztteam_renderOverlay(htmlContent, overlayPath);

    this.logger.log('Step 4 done: overlay rendered');
    return overlayPath;
  }

  /** Step 5: Create slideshow and merge everything with FFmpeg */
  private async ztteam_step5_render(
    images: string[],
    audioPath: string,
    overlayPath: string,
    subtitles: Array<{ start: number; end: number; text: string }>,
    audioDuration: number,
    videoX: number,
    videoY: number,
    videoW: number,
    videoH: number,
    workDir: string,
    subtitlesY?: number
  ) {
    this.logger.log('Step 5: FFmpeg rendering...');

    /** Create slideshow */
    const slideshowPath = path.join(workDir, 'slideshow.mp4');
    await this.ffmpegService.ztteam_createSlideshow(images, audioDuration, slideshowPath, videoW, videoH);

    /** Generate ASS subtitle file */
    const assContent = this.aiService.ztteam_generateASSContent(subtitles, videoY, 1080, undefined, subtitlesY);
    const subtitlePath = path.join(workDir, 'subtitles.ass');
    fs.writeFileSync(subtitlePath, assContent, 'utf-8');

    /** Final merge */
    const outputPath = path.join(workDir, 'output.mp4');
    await this.ffmpegService.ztteam_mergeAll({
      slideshowPath,
      voicePath: audioPath,
      overlayPath,
      subtitlePath,
      outputPath,
      duration: audioDuration,
      videoX,
      videoY
    });

    /** Generate thumbnail */
    const thumbnailPath = path.join(workDir, 'thumbnail.jpg');
    await this.ffmpegService.ztteam_generateThumbnail(outputPath, thumbnailPath);

    this.logger.log('Step 5 done: video rendered');
    return { videoPath: outputPath, thumbnailPath };
  }

  /** Helper: update reel record in database */
  private async ztteam_updateReel(reelId: string, data: any): Promise<void> {
    const updated = await this.prisma.ztteam_reels.update({
      where: { id: reelId },
      data,
    });
    this.eventEmitter.emit('reel.updated', updated);
  }
}
