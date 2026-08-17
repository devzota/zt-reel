import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ZTTeamRenderProcessor } from '../render/render.processor';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

@Injectable()
export class YoutubeCrawlerService {
  private readonly logger = new Logger(YoutubeCrawlerService.name);
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly renderProcessor: ZTTeamRenderProcessor
  ) { }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleCron() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.logger.log('Bắt đầu Crawler YouTube...');

    try {
      /** Phục hồi các video đang bị kẹt ở trạng thái QUEUED nhưng chưa có job */
      const stuckReels = await this.prisma.ztteam_reels.findMany({
        where: { source_type: 'YOUTUBE', status: 'QUEUED' }
      });
      if (stuckReels.length > 0) {
        this.logger.log(`Tìm thấy ${stuckReels.length} video YouTube bị kẹt, đang đẩy lại vào hàng đợi...`);
        for (const reel of stuckReels) {
          await this.renderProcessor.ztteam_addJob({
            reelId: reel.id,
            pageId: reel.page_id,
            wpPostId: reel.wp_post_id,
            wpPostTitle: reel.wp_post_title,
            templateId: reel.template_id || '',
          });
        }
      }

      const activeSettings = await this.prisma.ztteam_page_youtube_settings.findMany({
        where: { is_active: true },
        include: { source: true, page: true }
      });

      for (const setting of activeSettings) {
        if (!setting.source || !setting.source.is_active) continue;
        await this.crawlSourceForPage(setting.source, setting.page.id, setting.page.default_reel_template_id || '');
      }
    } catch (error: any) {
      this.logger.error(`Lỗi YouTube Crawler Cron: ${error.message}`);
    } finally {
      this.isRunning = false;
    }
  }

  async processSingleUrl(url: string, pageId: string): Promise<{ success: boolean; message: string }> {
    this.logger.log(`[processSingleUrl] Bắt đầu xử lý URL: ${url} cho page: ${pageId}`);

    const page = await this.prisma.ztteam_pages.findFirst({
      where: {
        OR: [
          { id: pageId },
          { fb_page_id: pageId }
        ]
      }
    });

    if (!page) {
      this.logger.warn(`[processSingleUrl] Không tìm thấy Fanpage ${pageId}`);
      return { success: false, message: `Không tìm thấy Fanpage tương ứng trên hệ thống` };
    }

    /** Nếu chưa có template thì lấy video template mặc định của hệ thống */
    let templateId = page.default_reel_template_id;
    if (!templateId) {
      let defaultTpl = await this.prisma.ztteam_templates.findFirst({ where: { format: 'video', is_default: true } });
      if (!defaultTpl) {
        defaultTpl = await this.prisma.ztteam_templates.findFirst({ where: { format: 'video' } });
      }
      if (defaultTpl) templateId = defaultTpl.id;
    }

    if (!templateId) {
      this.logger.warn(`[processSingleUrl] Fanpage ${pageId} không có template và không tìm thấy template mặc định`);
      return { success: false, message: 'Fanpage chưa được cài Giao diện (Template) Video và chưa có Template mặc định' };
    }

    this.logger.log(`[processSingleUrl] Đang tải bằng yt-dlp...`);
    /** Gọi hàm tải video với cờ bypassHistory = true để cho phép tải lại link cũ */
    const res = await this.processVideoUrlDetailed(url, page.id, templateId, true);
    return res;
  }

  async crawlSourceForPage(source: any, pageId: string, templateId: string) {
    if (!templateId) {
      this.logger.warn(`Fanpage ${pageId} chưa cấu hình Template Video, bỏ qua Crawler YouTube.`);
      return;
    }

    try {
      let videoUrls: string[] = [];

      if (source.source_type === 'LINKS') {
        videoUrls = source.url.split(/[\n,]+/).map((u: string) => u.trim()).filter((u: string) => u);
      } else if (source.source_type === 'CHANNEL') {
        const channelUrl = source.url;
        /** Dùng yt-dlp để lấy 20 video Shorts mới nhất từ kênh (để bù trừ những video đã tải) */
        const ytdlpArgs = `--extractor-args "youtube:player_client=ios,android,web" --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" --no-warnings`;
        const cmd = `yt-dlp ${ytdlpArgs} --flat-playlist --match-filter "duration <= 60" --max-downloads 20 --print id "${channelUrl}/shorts"`;
        const { stdout } = await execAsync(cmd);
        const ids = stdout.split('\n').map(id => id.trim()).filter(id => id);
        videoUrls = ids.map(id => `https://www.youtube.com/watch?v=${id}`);
      }

      /** Đảo ngược để lưu video cũ trước, video mới sau */
      videoUrls.reverse();

      let addedCount = 0;
      for (const url of videoUrls) {
        if (addedCount >= 5) {
          this.logger.log(`Đã đạt giới hạn 5 video cho Fanpage ${pageId} trong lần chạy này.`);
          break;
        }
        const added = await this.processVideoUrl(url, pageId, templateId);
        if (added) addedCount++;
      }
    } catch (error: any) {
      this.logger.error(`Lỗi crawl source ${source.name}: ${error.message}`);
    }
  }

  private async processVideoUrlDetailed(url: string, pageId: string, templateId: string, bypassHistory: boolean = false): Promise<{ success: boolean; message: string }> {
    if (!bypassHistory) {
      const existingHistory = await this.prisma.ztteam_reel_history.findUnique({
        where: {
          page_id_wp_post_id: { page_id: pageId, wp_post_id: url }
        }
      });

      if (existingHistory) {
        return { success: false, message: 'Video YouTube này đã tồn tại trong lịch sử cào bài của Fanpage.' };
      }
    }

    let originalTitle = 'YouTube Video (' + new Date().toLocaleDateString('vi-VN') + ')';
    let originalDescription = '';

    try {
      const tmpFile = path.join(process.cwd(), `yt_info_${Date.now()}.json`);
      try {
        const { ztteam_getStorageRoot } = require('../common/ztteam_storage.util');
        const cookiesFile = path.join(ztteam_getStorageRoot(), 'cookies.txt');
        const hasCookies = fs.existsSync(cookiesFile) && fs.statSync(cookiesFile).size > 10;
        const cookieFlag = hasCookies ? `--cookies "${cookiesFile}"` : '';
        const clientArgs = hasCookies ? '' : `--extractor-args "youtube:player_client=tv_embedded,android_vr"`;

        const ytdlpArgs = `${cookieFlag} ${clientArgs} --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" --no-warnings`;
        await execAsync(`yt-dlp ${ytdlpArgs} --dump-json "${url}" > "${tmpFile}"`, { timeout: 30000 });
        if (fs.existsSync(tmpFile)) {
          const info = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
          if (info.title) originalTitle = info.title;
          if (info.description) originalDescription = info.description;
          fs.unlinkSync(tmpFile);
        }
      } catch (dlErr: any) {
        this.logger.warn(`yt-dlp warning for ${url}: ${dlErr.message}`);
        /** Vẫn tạo reel với URL làm tiêu đề tạm để người dùng test được */
      }

      let targetPageId = pageId;
      if (!targetPageId) {
        const firstPage = await this.prisma.ztteam_pages.findFirst();
        if (firstPage) targetPageId = firstPage.id;
      }

      if (!targetPageId) {
        return { success: false, message: 'Chưa có Fanpage nào trên hệ thống để khởi tạo dữ liệu' };
      }

      const reel = await this.prisma.ztteam_reels.create({
        data: {
          page_id: targetPageId,
          wp_post_id: url,
          wp_post_title: originalTitle,
          wp_post_url: url,
          source_type: pageId ? 'YOUTUBE' : 'YOUTUBE_UNASSIGNED',
          template_id: templateId,
          status: 'QUEUED',
          ai_script: originalDescription,
        }
      });

      await this.renderProcessor.ztteam_addJob({
        reelId: reel.id,
        pageId: pageId,
        wpPostId: url,
        wpPostTitle: originalTitle,
        templateId: templateId,
      });

      await this.prisma.ztteam_reel_history.upsert({
        where: {
          page_id_wp_post_id: { page_id: pageId, wp_post_id: url }
        },
        create: {
          page_id: pageId,
          wp_post_id: url,
          title: originalTitle,
          description: originalDescription,
        },
        update: {
          title: originalTitle,
          description: originalDescription,
        }
      });

      this.logger.log(`Đã thêm video ${url} vào hàng đợi cho Fanpage ${pageId}`);
      return { success: true, message: `Đã đưa video "${originalTitle}" vào hàng đợi Render!` };
    } catch (err: any) {
      this.logger.error(`Lỗi xử lý video ${url}: ${err.message}`);
      return { success: false, message: `Lỗi xử lý video: ${err.message}` };
    }
  }

  private async processVideoUrl(url: string, pageId: string, templateId: string, bypassHistory: boolean = false): Promise<boolean> {
    const res = await this.processVideoUrlDetailed(url, pageId, templateId, bypassHistory);
    return res.success;
  }
}
