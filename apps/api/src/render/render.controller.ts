import { Controller, Get, Post, Param, Body, Query, UseGuards, Sse, MessageEvent, Header } from '@nestjs/common';
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
  @Header('Cache-Control', 'no-cache')
  @Header('X-Accel-Buffering', 'no')
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
        include: { 
          page: { 
            select: { 
              name: true, 
              avatar: true, 
              fb_page_id: true,
              add_link_to_caption: true,
              add_link_to_comment: true,
              fb_account: { select: { name: true } }
            } 
          } 
        },
      }),
      this.prisma.ztteam_reels.count({ where }),
    ]);

    const slugify = (text: string) => {
      if (!text) return '';
      return text.toString().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').trim();
    };

    /** Fetch last posted reels for scheduling calculation */
    const pageIds = [...new Set(reels.map(r => r.page_id))];
    const lastPostedReels = await this.prisma.ztteam_reels.findMany({
      where: { page_id: { in: pageIds }, status: 'POSTED' },
      orderBy: { updated_at: 'desc' },
      distinct: ['page_id']
    });
    const lastPostedMap = new Map(lastPostedReels.map(r => [r.page_id, r.updated_at]));
    
    /** Simulate queue to get precise scheduled times for all pending reels */
    const allPending = await this.prisma.ztteam_reels.findMany({
       where: { status: 'COMPLETED', is_posted: false, page_id: { in: pageIds } },
       orderBy: { created_at: 'asc' },
       include: { page: true }
    });
    
    const pageNextTimeMap = new Map<string, Date | null>();
    const reelScheduledTimeMap = new Map<string, Date | null>();

    for (const pending of allPending) {
       const pageId = pending.page_id;
       const p = pending.page as any;
       if (!p) continue;

       let baseTime = pageNextTimeMap.get(pageId);
       if (!baseTime) {
         baseTime = lastPostedMap.get(pageId) || pending.updated_at;
       }

       let scheduledAt: Date | null = pending.updated_at;

       if (p.schedule_mode === 'fixed') {
         const times = p.schedule_fixed_times || [];
         if (times.length > 0) {
           times.sort();
           let found = false;
           for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
             for (const time of times) {
               const [h, m] = time.split(':').map(Number);
               const testDate = new Date(baseTime);
               testDate.setDate(testDate.getDate() + dayOffset);
               testDate.setHours(h, m, 0, 0);
               if (testDate > baseTime) {
                 scheduledAt = testDate;
                 found = true;
                 break;
               }
             }
             if (found) break;
           }
         } else {
           scheduledAt = null;
         }
       } else {
         const gap = p.schedule_immediate_gap_minutes || 0;
         const diff = gap * 60000;
         const candidate = new Date(baseTime.getTime() + diff);
         scheduledAt = candidate > pending.updated_at ? candidate : pending.updated_at;
       }

       reelScheduledTimeMap.set(pending.id, scheduledAt);
       pageNextTimeMap.set(pageId, scheduledAt);
    }

    /** Generate final_caption dynamically for UI preview and add timestamps */
    const reelsWithDetails = reels.map(r => {
      let finalCaption = r.ai_caption || r.wp_post_title || '';
      let finalComment = null;

      /** Clean up any old tracking links that might have been baked into the database */
      if (finalCaption.includes('utm_source=reel')) {
        const parts = finalCaption.split(/(👉|🔥|📌|👇|🔗|Read more:)/);
        if (parts.length > 1) {
          finalCaption = parts[0].trim();
        } else {
          finalCaption = finalCaption.split(/\n\n.*utm_source=reel/)[0].trim();
        }
      }
      
      const utmMedium = slugify(r.page?.fb_account?.name || 'account');
      const utmCampaign = slugify(r.page?.name || 'page');
      const trackingLink = r.wp_post_url ? `${r.wp_post_url}${r.wp_post_url.includes('?') ? '&' : '?'}utm_source=reel&utm_medium=${utmMedium}&utm_campaign=${utmCampaign}` : '';
      
      if (r.wp_post_url && r.page?.add_link_to_caption) {
        const prefixes = [
          '👉 Discover more here:',
          '🔥 Read the full story:',
          '📌 Check out the details:',
          '👇 Full article link:',
          '🔗 Learn more at:'
        ];
        const prefixIndex = r.id.charCodeAt(r.id.length - 1) % prefixes.length;
        const prefix = prefixes[prefixIndex];
        finalCaption = `${prefix} ${trackingLink}\n\n${finalCaption}`;
      }
      
      if (r.wp_post_url && r.page?.add_link_to_comment) {
        const commentPrefixes = [
          '👉 Discover more here:',
          '🔥 Read the full story:',
          '📌 Check out the details:',
          '👇 Full article link:',
          '🔗 Learn more at:'
        ];
        const prefixIndex = r.id.charCodeAt(r.id.length - 2) % commentPrefixes.length;
        finalComment = `${commentPrefixes[prefixIndex]} ${trackingLink}`;
      }

      let posted_at = null;
      let scheduled_at = null;

      if (r.status === 'POSTED') {
        posted_at = r.updated_at;
      } else if (r.status === 'COMPLETED' && !r.is_posted) {
        scheduled_at = reelScheduledTimeMap.get(r.id) || r.updated_at;
      }

      return { ...r, final_caption: finalCaption, final_comment: finalComment, posted_at, scheduled_at };
    });

    return { reels: reelsWithDetails, total, page: parseInt(page || '1', 10), limit: take };
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
      let trackingLinkManual = '';
      
      /** Clean up any old tracking links that might have been baked into the database */
      if (description.includes('utm_source=reel')) {
        const parts = description.split(/(👉|🔥|📌|👇|🔗|Read more:)/);
        if (parts.length > 1) {
          description = parts[0].trim();
        } else {
          description = description.split(/\n\n.*utm_source=reel/)[0].trim();
        }
      }
      
      if (reel.wp_post_url) {
        const slugify = (text: string) => {
          if (!text) return '';
          return text.toString().toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').trim();
        };
        const pageData = await this.prisma.ztteam_pages.findUnique({
          where: { id: reel.page_id },
          include: { fb_account: true }
        });
        
        const utmMedium = slugify(pageData?.fb_account?.name || 'account');
        const utmCampaign = slugify(pageData?.name || 'page');
        trackingLinkManual = `${reel.wp_post_url}${reel.wp_post_url.includes('?') ? '&' : '?'}utm_source=reel&utm_medium=${utmMedium}&utm_campaign=${utmCampaign}`;
        
        if (pageData?.add_link_to_caption) {
          const prefixes = [
            '👉 Discover more here:',
            '🔥 Read the full story:',
            '📌 Check out the details:',
            '👇 Full article link:',
            '🔗 Learn more at:'
          ];
          const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
          description = `${prefix} ${trackingLinkManual}\n\n${description}`;
        }
      }

      const response = await this.facebookService.ztteam_publishReel(
        reel.page.fb_page_id,
        videoPath,
        description
      );

      /** Check if we should add link to comment */
      if (reel.page.add_link_to_comment && trackingLinkManual && response.id) {
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
            `${commentPrefix} ${trackingLinkManual}`
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
