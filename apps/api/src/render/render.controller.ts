import { Controller, Get, Post, Param, Body, Query, UseGuards, Sse, MessageEvent } from '@nestjs/common';
import { ZTTeamAuthGuard } from '../auth/auth.guard';
import { ZTTeamRenderProcessor } from './render.processor';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, fromEvent } from 'rxjs';
import { map } from 'rxjs/operators';
import { ZTTeamFacebookService } from '../facebook/facebook.service';

/**
 * ZTTeamRenderController — API endpoints for managing reel rendering.
 */
@Controller('render')
export class ZTTeamRenderController {
  constructor(
    private readonly renderProcessor: ZTTeamRenderProcessor,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly facebookService: ZTTeamFacebookService,
  ) {}

  /**
   * SSE endpoint for live updates. No auth guard so the browser EventSource can connect easily.
   */
  @Sse('events')
  ztteam_renderEvents(): Observable<MessageEvent> {
    return fromEvent(this.eventEmitter, 'reel.updated').pipe(
      map((payload) => {
        return { data: payload } as MessageEvent;
      }),
    );
  }

  /**
   * Create a new render job.
   * Creates a reel record in DB then enqueues the job.
   */
  @Post('create')
  @UseGuards(ZTTeamAuthGuard)
  async ztteam_createRenderJob(
    @Body() body: { pageId: string; wpPostId: string; wpPostTitle: string; wpPostUrl?: string; templateId: string },
  ) {
    /** Find the internal page ID from fb_page_id */
    const page = await this.prisma.ztteam_pages.findFirst({
      where: { fb_page_id: body.pageId }
    });
    
    if (!page) {
      return { error: 'Không tìm thấy Fanpage', code: 'NOT_FOUND' };
    }

    /** Check if post was already used for this page */
    const existing = await this.prisma.ztteam_reel_history.findUnique({
      where: {
        page_id_wp_post_id: {
          page_id: page.id,
          wp_post_id: body.wpPostId,
        },
      },
    });

    if (existing) {
      return { error: 'Bài viết này đã được tạo Reel cho Page này rồi', code: 'DUPLICATE' };
    }

    /** Create the reel record */
    const reel = await this.prisma.ztteam_reels.create({
      data: {
        page_id: page.id,
        wp_post_id: body.wpPostId,
        wp_post_title: body.wpPostTitle,
        wp_post_url: body.wpPostUrl,
        template_id: body.templateId,
        status: 'QUEUED',
        progress: 0,
      },
    });

    /** Enqueue the job */
    await this.renderProcessor.ztteam_addJob({
      reelId: reel.id,
      pageId: page.id,
      wpPostId: body.wpPostId,
      wpPostTitle: body.wpPostTitle,
      templateId: body.templateId,
    });

    return { reelId: reel.id, status: 'QUEUED', message: 'Đã thêm vào hàng đợi render' };
  }

  /**
   * Get status of a specific reel.
   */
  @Get('status/:id')
  async ztteam_getReelStatus(@Param('id') id: string) {
    const reel = await this.prisma.ztteam_reels.findUnique({
      where: { id },
      include: { page: { select: { name: true, avatar: true } } },
    });

    if (!reel) {
      return { error: 'Reel không tồn tại' };
    }

    return reel;
  }

  /**
   * List all reels with optional filters.
   */
  @Get('list')
  async ztteam_listReels(
    @Query('pageId') pageId?: string,
    @Query('fbPageId') fbPageId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const take = parseInt(limit || '20', 10);
    const skip = ((parseInt(page || '1', 10) - 1)) * take;

    const where: any = {};
    if (pageId) where.page_id = pageId;
    if (fbPageId) where.page = { fb_page_id: fbPageId };
    if (status) where.status = status;

    const [reels, total] = await Promise.all([
      this.prisma.ztteam_reels.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take,
        skip,
        include: { page: { select: { name: true, avatar: true, fb_page_id: true } } },
      }),
      this.prisma.ztteam_reels.count({ where }),
    ]);

    return { reels, total, page: parseInt(page || '1', 10), limit: take };
  }

  /**
   * Retry a failed reel render.
   */
  @Post('retry/:id')
  async ztteam_retryRender(@Param('id') id: string) {
    const reel = await this.prisma.ztteam_reels.findUnique({ where: { id } });
    if (!reel) return { error: 'Reel không tồn tại' };
    if (reel.status !== 'FAILED') return { error: 'Chỉ có thể retry reel bị lỗi' };

    /** Reset status and re-enqueue */
    await this.prisma.ztteam_reels.update({
      where: { id },
      data: { status: 'QUEUED', progress: 0, error_log: null },
    });

    await this.renderProcessor.ztteam_addJob({
      reelId: reel.id,
      pageId: reel.page_id,
      wpPostId: reel.wp_post_id,
      wpPostTitle: reel.wp_post_title,
      templateId: reel.template_id,
    });

    return { reelId: reel.id, status: 'QUEUED', message: 'Đã thêm lại vào hàng đợi' };
  }

  /**
   * Delete a reel record and its files.
   */
  @Post('delete/:id')
  async ztteam_deleteReel(@Param('id') id: string) {
    const reel = await this.prisma.ztteam_reels.findUnique({ where: { id } });
    if (!reel) return { error: 'Reel không tồn tại' };

    /** Delete physical files if they exist */
    const fs = require('fs');
    const path = require('path');
    
    try {
      const reelDir = path.join(process.cwd(), 'storage', 'reels', id);
      if (fs.existsSync(reelDir)) {
        fs.rmSync(reelDir, { recursive: true, force: true });
      }
    } catch (e) {
      console.error('Error deleting files', e);
    }

    /** Delete reel record */
    await this.prisma.ztteam_reels.delete({ where: { id } });

    return { message: 'Đã xóa reel thành công' };
  }

  /**
   * Post a completed reel to Facebook.
   */
  @Post('post/:id')
  @UseGuards(ZTTeamAuthGuard)
  async ztteam_postReelToFacebook(@Param('id') id: string) {
    const reel = await this.prisma.ztteam_reels.findUnique({
      where: { id },
      include: { page: true }
    });

    if (!reel) return { error: 'Reel không tồn tại' };
    if (reel.status !== 'COMPLETED') return { error: 'Chỉ có thể đăng Reel đã hoàn thành' };

    const fs = require('fs');
    const path = require('path');
    const videoPath = path.join(process.cwd(), 'storage', 'reels', reel.id, 'output.mp4');
    
    if (!fs.existsSync(videoPath)) {
      return { error: 'File video không tồn tại trên server' };
    }

    try {
      let description = reel.ai_caption || reel.wp_post_title || '';
      
      /** Check if we should add link to caption */
      if (reel.page.add_link_to_caption && reel.wp_post_url) {
        const prefixes = ['Source:', 'Read more:', 'Click here:', 'More info:', 'Full article:', 'Discover more:'];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        description = `${prefix} ${reel.wp_post_url}\n\n${description}`;
      }

      const response = await this.facebookService.ztteam_publishReel(
        reel.page.fb_page_id,
        videoPath,
        description
      );

      /** Check if we should add link to comment */
      if (reel.page.add_link_to_comment && reel.wp_post_url && response.id) {
        try {
          const commentPrefixes = ['Read the full story here:', 'More details at:', 'Check out the full article:'];
          const commentPrefix = commentPrefixes[Math.floor(Math.random() * commentPrefixes.length)];
          await this.facebookService.ztteam_publishComment(
            reel.page.fb_page_id,
            response.id,
            `${commentPrefix} ${reel.wp_post_url}`
          );
        } catch (e: any) {
          /** Ignore comment error so it doesn't fail the post status */
          console.error('Failed to post comment', e.message);
        }
      }

      await this.prisma.ztteam_reels.update({
        where: { id: reel.id },
        data: { 
          status: 'POSTED',
          fb_post_id: response.id 
        }
      });
      
      this.eventEmitter.emit('reel.updated', { id: reel.id, status: 'POSTED', fb_post_id: response.id });

      return { message: 'Đã đăng thành công', facebookResponse: response };
    } catch (e: any) {
      return { error: e.message };
    }
  }
}
