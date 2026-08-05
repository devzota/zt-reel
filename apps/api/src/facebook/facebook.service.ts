import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ZTTeamFacebookService {
  private readonly logger = new Logger(ZTTeamFacebookService.name);
  private readonly API_VERSION = 'v25.0';

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) { }

  async ztteam_exchangeLongLivedToken(shortToken: string, userId: string) {
    /** In a real scenario, appId and appSecret should come from DB or .env */
    const appId = process.env.FB_APP_ID || '';
    const appSecret = process.env.FB_APP_SECRET || '';

    try {
      const response = await firstValueFrom(
        this.httpService.get(`https://graph.facebook.com/${this.API_VERSION}/oauth/access_token`, {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: appId,
            client_secret: appSecret,
            fb_exchange_token: shortToken,
          }
        })
      );

      const longLivedToken = response.data.access_token;

      /** Get FB user id */
      const meResponse = await firstValueFrom(
        this.httpService.get(`https://graph.facebook.com/${this.API_VERSION}/me`, {
          params: { access_token: longLivedToken }
        })
      );

      const fbUserId = meResponse.data.id;
      const fbName = meResponse.data.name;

      /** Upsert FB account in DB */
      let fbAccount = await this.prisma.ztteam_fb_accounts.findFirst({
        where: { fb_user_id: fbUserId, owner_user_id: userId }
      });

      if (fbAccount) {
        fbAccount = await this.prisma.ztteam_fb_accounts.update({
          where: { id: fbAccount.id },
          data: { user_token_encrypted: longLivedToken, name: fbName }
        });
      } else {
        fbAccount = await this.prisma.ztteam_fb_accounts.create({
          data: {
            fb_user_id: fbUserId,
            name: fbName,
            user_token_encrypted: longLivedToken,
            owner_user_id: userId,
          }
        });
      }

      return fbAccount;
    } catch (error) {
      this.logger.error('Error exchanging Facebook token', error);
      throw error;
    }
  }

  async ztteam_fetchPages(fbAccountId: string) {
    const fbAccount = await this.prisma.ztteam_fb_accounts.findFirst({
      where: { fb_user_id: fbAccountId }
    });

    if (!fbAccount) {
      throw new Error('FB Account not found');
    }

    try {
      /** GET /me/accounts with user long lived token gives page access tokens that do not expire */
      const response = await firstValueFrom(
        this.httpService.get(`https://graph.facebook.com/${this.API_VERSION}/me/accounts`, {
          params: {
            access_token: fbAccount.user_token_encrypted,
            fields: 'id,name,picture.type(large),category,followers_count,fan_count,access_token'
          }
        })
      );

      const pages = response.data.data;

      /** Xóa toàn bộ page cũ của account này trước khi sync lại */
      await this.prisma.ztteam_page_sources.deleteMany({
        where: {
          page: { fb_account_id: fbAccount.id }
        }
      });
      await this.prisma.ztteam_pages.deleteMany({
        where: { fb_account_id: fbAccount.id }
      });

      for (const page of pages) {
        const pageData: any = {
          name: page.name,
          avatar: page.picture?.data?.url || null,
          category: page.category || null,
          page_token_encrypted: page.access_token,
        };

        const newCount = page.followers_count ?? page.fan_count;
        if (newCount !== undefined) {
          pageData.follower_count = newCount;
        }

        await this.prisma.ztteam_pages.create({
          data: {
            ...pageData,
            fb_page_id: page.id,
            fb_account_id: fbAccount.id,
          }
        });
      }

      return this.ztteam_getConnectedPages(fbAccount.owner_user_id);
    } catch (error) {
      this.logger.error('Error fetching Facebook pages', error);
      throw error;
    }
  }

  private async ztteam_computePageTimesAndNextVideo(page: any) {
    let lastRenderTime = page.last_auto_scan_at ? page.last_auto_scan_at : null;
    let nextRenderTime = null;
    if (page.auto_create_enabled) {
      if (lastRenderTime) {
        nextRenderTime = new Date(new Date(lastRenderTime).getTime() + page.auto_scan_interval_hours * 3600000);
      } else {
        nextRenderTime = new Date();
      }
    }

    const lastPublishedReel = await this.prisma.ztteam_reels.findFirst({
      where: { page_id: page.id, status: 'POSTED' },
      orderBy: { updated_at: 'desc' }
    });
    
    const lastPublishedImage = await this.prisma.ztteam_images.findFirst({
      where: { page_id: page.id, is_posted: true },
      orderBy: { posted_at: 'desc' }
    });

    let lastPublishTime = lastPublishedReel ? lastPublishedReel.updated_at : null;
    if (lastPublishedImage?.posted_at && (!lastPublishTime || lastPublishedImage.posted_at > lastPublishTime)) {
      lastPublishTime = lastPublishedImage.posted_at;
    }
    
    let nextPublishTime = null;

    if (page.auto_publish_enabled === false) {
      nextPublishTime = null;
    } else if (page.schedule_mode === 'immediate') {
      if (lastPublishTime) {
        nextPublishTime = new Date(new Date(lastPublishTime).getTime() + page.schedule_immediate_gap_minutes * 60000);
      } else {
        nextPublishTime = new Date();
      }
    } else if (page.schedule_mode === 'fixed' && page.schedule_fixed_times.length > 0) {
      const now = new Date();
      const nowMs = now.getHours() * 60 + now.getMinutes();

      let nextTime = null;
      let minDiff = Infinity;

      for (const t of page.schedule_fixed_times) {
        const [h, m] = t.split(':').map(Number);
        const tMs = h * 60 + m;
        let diff = tMs - nowMs;
        if (diff <= 0) {
          diff += 24 * 60;
        }
        if (diff < minDiff) {
          minDiff = diff;
          nextTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
          if (tMs <= nowMs) {
            nextTime.setDate(nextTime.getDate() + 1);
          }
        }
      }
      nextPublishTime = nextTime;
    }

    const nextReelToPublish = await this.prisma.ztteam_reels.findFirst({
      where: { page_id: page.id, status: 'COMPLETED', is_posted: false },
      orderBy: { created_at: 'asc' }
    });

    let templateName = null;
    if (page.default_reel_template_id) {
      const tpl = await this.prisma.ztteam_templates.findUnique({
        where: { id: page.default_reel_template_id },
        select: { name: true }
      });
      templateName = tpl ? tpl.name : null;
    }

    return {
      lastRenderTime,
      nextRenderTime,
      lastPublishTime,
      nextPublishTime,
      nextVideoTitle: nextReelToPublish ? (nextReelToPublish.wp_post_title || 'Video AI') : null,
      templateName
    };
  }

  async ztteam_getConnectedPages(userId: string) {
    const fbAccounts = await this.prisma.ztteam_fb_accounts.findMany({
      where: { owner_user_id: userId },
      select: { id: true }
    });

    if (fbAccounts.length === 0) return [];

    const accountIds = fbAccounts.map(a => a.id);

    const pages = await this.prisma.ztteam_pages.findMany({
      where: { fb_account_id: { in: accountIds } },
      include: { fb_account: true },
      orderBy: { name: 'asc' }
    });

    const result = await Promise.all(pages.map(async p => {
      const times = await this.ztteam_computePageTimesAndNextVideo(p);
      return {
        id: p.fb_page_id,
        name: p.name,
        category: p.category,
        followersCount: p.follower_count,
        avatar: p.avatar,
        ownerName: p.fb_account.name,
        status: p.token_status,
        tags: p.tags,
        postFormat: p.post_format,
        scheduleMode: p.schedule_mode,
        autoPublishEnabled: p.auto_publish_enabled,
        autoCreateEnabled: p.auto_create_enabled,
        nextPublishTime: times.nextPublishTime,
        nextRenderTime: times.nextRenderTime,
        scheduleFixedTimes: p.schedule_fixed_times,
        scheduleImmediateGapMinutes: p.schedule_immediate_gap_minutes,
        autoScanIntervalHours: p.auto_scan_interval_hours,
        defaultReelTemplateId: p.default_reel_template_id,
        defaultReelTemplateName: times.templateName,
        nextVideoTitle: times.nextVideoTitle
        /** We do not send accessToken back to frontend for security */
      };
    }));
    return result;
  }


  async ztteam_getPageSettings(pageId: string, userId: string) {
    const page = await this.prisma.ztteam_pages.findFirst({
      where: { fb_page_id: pageId },
      include: {
        fb_account: true,
        sources: true
      }
    });

    if (!page || page.fb_account.owner_user_id !== userId) {
      throw new Error('Fanpage không tồn tại hoặc bạn không có quyền');
    }

    const times = await this.ztteam_computePageTimesAndNextVideo(page);

    return {
      id: page.id,
      fb_page_id: page.fb_page_id,
      name: page.name,
      avatar: page.avatar,
      tags: page.tags,
      post_format: page.post_format,
      auto_publish_enabled: page.auto_publish_enabled,
      add_link_to_caption: page.add_link_to_caption,
      add_link_to_comment: page.add_link_to_comment,
      schedule_mode: page.schedule_mode,
      schedule_fixed_times: page.schedule_fixed_times,
      schedule_immediate_gap_minutes: page.schedule_immediate_gap_minutes,
      default_reel_template_id: page.default_reel_template_id,
      default_image_template_id: page.default_image_template_id,
      auto_create_enabled: page.auto_create_enabled,
      auto_scan_interval_hours: page.auto_scan_interval_hours,
      auto_scan_batch_size: page.auto_scan_batch_size,
      auto_queue_limit: page.auto_queue_limit,
      auto_max_post_age_days: page.auto_max_post_age_days,
      ai_tone: page.ai_tone,
      ai_caption_length: page.ai_caption_length,
      ai_custom_prompt: page.ai_custom_prompt,
      voice_speed: page.voice_speed,
      last_render_time: times.lastRenderTime,
      next_render_time: times.nextRenderTime,
      last_publish_time: times.lastPublishTime,
      next_publish_time: times.nextPublishTime,
      next_video_title: times.nextVideoTitle,
      sources: page.sources.map(s => ({
        id: s.id,
        target_site_id: s.target_site_id,
        target_category_id: s.target_category_id,
        target_tags: s.target_tags,
        is_active: s.is_active
      }))
    };
  }

  async ztteam_updatePageSettings(pageId: string, userId: string, config: any) {
    const page = await this.prisma.ztteam_pages.findFirst({
      where: { fb_page_id: pageId },
      include: { fb_account: true }
    });

    if (!page || page.fb_account.owner_user_id !== userId) {
      throw new Error('Fanpage không tồn tại hoặc bạn không có quyền');
    }

    /** Update main page fields */
    await this.prisma.ztteam_pages.update({
      where: { id: page.id },
      data: {
        tags: config.tags,
        post_format: config.post_format,
        auto_publish_enabled: config.auto_publish_enabled !== undefined ? config.auto_publish_enabled : true,
        add_link_to_caption: config.add_link_to_caption,
        add_link_to_comment: config.add_link_to_comment,
        schedule_mode: config.schedule_mode,
        schedule_fixed_times: config.schedule_fixed_times,
        schedule_immediate_gap_minutes: config.schedule_immediate_gap_minutes,
        default_reel_template_id: config.default_reel_template_id,
        default_image_template_id: config.default_image_template_id,
        auto_create_enabled: config.auto_create_enabled,
        auto_scan_interval_hours: config.auto_scan_interval_hours,
        auto_scan_batch_size: config.auto_scan_batch_size,
        auto_queue_limit: config.auto_queue_limit,
        auto_max_post_age_days: config.auto_max_post_age_days,
        ai_tone: config.ai_tone,
        ai_caption_length: config.ai_caption_length,
        ai_custom_prompt: config.ai_custom_prompt,
        voice_speed: config.voice_speed,
      }
    });

    /** Handle sources */
    if (config.sources && Array.isArray(config.sources)) {
      /** Delete old sources */
      await this.prisma.ztteam_page_sources.deleteMany({
        where: { page_id: page.id }
      });
      /** Add new sources */
      if (config.sources.length > 0) {
        await this.prisma.ztteam_page_sources.createMany({
          data: config.sources.map((s: any) => ({
            page_id: page.id,
            target_site_id: s.target_site_id,
            target_category_id: s.target_category_id,
            target_tags: s.target_tags,
            is_active: s.is_active !== undefined ? s.is_active : true
          }))
        });
      }
    }

    return { success: true };
  }


  async ztteam_testPost(pageId: string, userId: string, message: string) {
    const page = await this.prisma.ztteam_pages.findFirst({
      where: { fb_page_id: pageId },
      include: { fb_account: true }
    });

    if (!page) {
      throw new Error('Fanpage không tồn tại trong hệ thống');
    }
    if (page.fb_account.owner_user_id !== userId) {
      throw new Error('Bạn không có quyền thao tác trên Fanpage này');
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `https://graph.facebook.com/${this.API_VERSION}/${pageId}/feed`,
          { message },
          { params: { access_token: page.page_token_encrypted } }
        )
      );

      return { success: true, postId: response.data.id };
    } catch (error: any) {
      this.logger.error('Error posting to Facebook', error.response?.data || error);
      throw new Error(error.response?.data?.error?.message || 'Lỗi kết nối đến Facebook API');
    }
  }

  async ztteam_getPageInsights(pageId: string, userId: string) {
    const page = await this.prisma.ztteam_pages.findFirst({
      where: { fb_page_id: pageId },
      include: { fb_account: true }
    });

    if (!page || page.fb_account.owner_user_id !== userId) {
      throw new Error('Fanpage không tồn tại hoặc bạn không có quyền');
    }

    try {
      const metrics = ['page_media_view', 'page_total_media_view_unique', 'page_views_total', 'page_post_engagements', 'page_daily_follows'];
      const results = [];

      for (const metric of metrics) {
        try {
          const res = await firstValueFrom(
            this.httpService.get(
              `https://graph.facebook.com/${this.API_VERSION}/${pageId}/insights`,
              {
                params: { metric, period: 'day', date_preset: 'last_28d', access_token: page.page_token_encrypted }
              }
            )
          );
          if (res.data?.data?.length > 0) {
            results.push(res.data.data[0]);
          }
        } catch (e: any) {
          this.logger.warn(`Failed metric ${metric}:`, e.response?.data?.error?.message);
        }
      }

      return results;
    } catch (error: any) {
      this.logger.warn('Error fetching Facebook insights, returning empty data.', error.response?.data || error.message);
      /** Fallback: return mock/empty data so frontend doesn't break */
      return [];
    }
  }

  async ztteam_getTopPosts(pageId: string, userId: string) {
    const page = await this.prisma.ztteam_pages.findFirst({
      where: { fb_page_id: pageId },
      include: { fb_account: true }
    });

    if (!page || page.fb_account.owner_user_id !== userId) {
      throw new Error('Fanpage không tồn tại hoặc bạn không có quyền');
    }

    try {
      let response;
      try {
        response = await firstValueFrom(
          this.httpService.get(
            `https://graph.facebook.com/${this.API_VERSION}/${pageId}/published_posts`,
            {
              params: {
                fields: 'id,message,created_time,full_picture,reactions.summary(true),comments.summary(true),shares',
                limit: 50,
                access_token: page.page_token_encrypted
              }
            }
          )
        );
      } catch (fallbackErr: any) {
        this.logger.warn(`Fallback fetching top posts without engagement:`, fallbackErr.response?.data?.error?.message);
        response = await firstValueFrom(
          this.httpService.get(
            `https://graph.facebook.com/${this.API_VERSION}/${pageId}/published_posts`,
            {
              params: {
                fields: 'id,message,created_time,full_picture',
                limit: 50,
                access_token: page.page_token_encrypted
              }
            }
          )
        );
      }

      /** Lấy danh sách videos từ Facebook để có con số lượt xem (video views) chuẩn xác */
      let videoViewsMap: Record<string, number> = {};
      try {
        const videoRes = await firstValueFrom(
          this.httpService.get(`https://graph.facebook.com/${this.API_VERSION}/${pageId}/videos`, {
            params: {
              fields: 'id,views',
              limit: 25,
              access_token: page.page_token_encrypted
            }
          })
        );
        if (videoRes.data?.data) {
          for (const v of videoRes.data.data) {
            if (v.id) videoViewsMap[v.id] = v.views || 0;
          }
        }
      } catch (e: any) {
        /** Ignore video fetch error */
      }

      /** Lấy post_clicks song song cho từng bài để xử lý siêu tốc */
      const rawPosts = (response.data?.data || []).slice(0, 25);
      const posts = await Promise.all(rawPosts.map(async (post: any) => {
        let reactionsCount = post.reactions?.summary?.total_count || 0;
        let commentsCount = post.comments?.summary?.total_count || 0;
        let sharesCount = post.shares?.count || 0;

        let clicks = 0;
        let photoViews = 0;
        let mediaViews = 0;
        let mediaViewsUnique = 0;
        let insightsVideoViews = 0;

        try {
          const insightRes = await firstValueFrom(
            this.httpService.get(
              `https://graph.facebook.com/${this.API_VERSION}/${post.id}/insights`,
              {
                params: {
                  metric: 'post_media_view,post_total_media_view_unique,post_video_views,post_clicks,post_clicks_by_type,post_activity_by_action_type',
                  access_token: page.page_token_encrypted
                }
              }
            )
          );
          const data = insightRes.data?.data || [];
          for (const item of data) {
            if (item.name === 'post_clicks') {
              clicks = Math.max(clicks, item.values?.[0]?.value || 0);
            }
            if (item.name === 'post_clicks_by_type') {
              const types = item.values?.[0]?.value || {};
              photoViews = Math.max(photoViews, types['photo view'] || 0);
            }
            if (item.name === 'post_media_view') {
              mediaViews = Math.max(mediaViews, item.values?.[0]?.value || 0);
            }
            if (item.name === 'post_total_media_view_unique') {
              mediaViewsUnique = Math.max(mediaViewsUnique, item.values?.[0]?.value || 0);
            }
            if (item.name === 'post_video_views') {
              insightsVideoViews = Math.max(insightsVideoViews, item.values?.[0]?.value || 0);
            }
            if (item.name === 'post_activity_by_action_type') {
              const types = item.values?.[0]?.value || {};
              if (reactionsCount === 0 && types['like']) reactionsCount = types['like'];
              if (commentsCount === 0 && types['comment']) commentsCount = types['comment'];
              if (sharesCount === 0 && types['share']) sharesCount = types['share'];
            }
          }
        } catch (e: any) {
          /** Ignore insight error */
        }

        /** Lượt xem video/reel chuẩn từ node video */
        let videoViews = 0;
        for (const vId in videoViewsMap) {
          if (post.id && post.id.includes(vId)) {
            videoViews = videoViewsMap[vId];
            break;
          }
        }

        /** Tổng tương tác chuẩn Meta DOC: Cảm xúc + Lượt nhấp + Bình luận + Chia sẻ */
        const engagements = reactionsCount + clicks + commentsCount + sharesCount;

        /** Lượt xem (Impressions): Sử dụng post_media_view (nếu có), nếu video thì kết hợp videoViews */
        let views = mediaViews > 0 ? mediaViews : (videoViews > 0 ? videoViews : (insightsVideoViews > 0 ? insightsVideoViews : (photoViews > 0 ? photoViews : clicks)));

        /** Người xem (Reach): Sử dụng post_total_media_view_unique (nếu có) */
        let reach = mediaViewsUnique > 0 ? mediaViewsUnique : views;

        /** Lượt hiển thị (Impressions): Bằng số views đối với API hiện tại */
        let impressions = views;

        /** Đảm bảo không bao giờ bị 0 nếu bài viết có tương tác */
        if (views === 0 && engagements > 0) views = engagements;
        if (reach === 0 && engagements > 0) reach = engagements;
        if (impressions === 0 && engagements > 0) impressions = engagements;

        return {
          id: post.id,
          message: post.message || '',
          created_time: post.created_time,
          full_picture: post.full_picture || null,
          views: views,
          reach: reach,
          clicks: clicks,
          impressions: impressions,
          reactions: reactionsCount,
          comments: commentsCount,
          shares: sharesCount,
          engagements
        };
      }));

      /** Sắp xếp theo tương tác giảm dần */
      posts.sort((a, b) => b.engagements - a.engagements);

      return posts;
    } catch (error: any) {
      this.logger.warn(`Failed to fetch top posts for page ${pageId}:`, error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Publish a generated Reel to the Fanpage
   */
  async ztteam_publishReel(pageId: string, videoPath: string, description: string) {
    const page = await this.prisma.ztteam_pages.findFirst({
      where: { fb_page_id: pageId }
    });

    if (!page || !page.page_token_encrypted) {
      throw new Error('Fanpage không tồn tại hoặc chưa cấu hình token');
    }

    try {
      const FormData = require('form-data');
      const fs = require('fs');
      const form = new FormData();
      form.append('access_token', page.page_token_encrypted);
      form.append('description', description);
      form.append('source', fs.createReadStream(videoPath));

      const response = await firstValueFrom(
        this.httpService.post(
          `https://graph.facebook.com/${this.API_VERSION}/${pageId}/videos`,
          form,
          { headers: form.getHeaders(), maxBodyLength: Infinity }
        )
      );

      return response.data;
    } catch (error: any) {
      this.logger.error('Error publishing reel to Facebook', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Publish a comment to a Facebook post
   */
  /**
   * Publish a generated Photo to the Fanpage
   */
  async ztteam_publishPhoto(pageId: string, imagePath: string, message: string) {
    const page = await this.prisma.ztteam_pages.findFirst({
      where: { fb_page_id: pageId }
    });

    if (!page || !page.page_token_encrypted) {
      throw new Error('Fanpage không tồn tại hoặc chưa cấu hình token');
    }

    try {
      const FormData = require('form-data');
      const fs = require('fs');
      const form = new FormData();
      form.append('access_token', page.page_token_encrypted);
      form.append('message', message);
      form.append('source', fs.createReadStream(imagePath));

      const response = await firstValueFrom(
        this.httpService.post(
          `https://graph.facebook.com/${this.API_VERSION}/${pageId}/photos`,
          form,
          { headers: form.getHeaders(), maxBodyLength: Infinity }
        )
      );

      return response.data.id || response.data.post_id;
    } catch (error: any) {
      this.logger.error('Error publishing photo to Facebook', error.response?.data || error.message);
      throw error;
    }
  }

  async ztteam_publishComment(pageId: string, postId: string, message: string) {
    const page = await this.prisma.ztteam_pages.findFirst({
      where: { fb_page_id: pageId }
    });

    if (!page || !page.page_token_encrypted) {
      throw new Error('Fanpage không tồn tại hoặc chưa cấu hình token');
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `https://graph.facebook.com/${this.API_VERSION}/${postId}/comments`,
          { message, access_token: page.page_token_encrypted }
        )
      );

      return response.data;
    } catch (error: any) {
      this.logger.error('Error publishing comment to Facebook', error.response?.data || error.message);
      throw error;
    }
  }
}
