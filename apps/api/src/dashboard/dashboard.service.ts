import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ZTTeamFacebookService } from '../facebook/facebook.service';

@Injectable()
export class ZTTeamDashboardService {
  private readonly logger = new Logger(ZTTeamDashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly facebookService: ZTTeamFacebookService
  ) {}

  async ztteam_getStats(userId: string, pageId?: string, siteId?: string) {
    /** 1. Get user's FB accounts and pages */
    const fbAccounts = await this.prisma.ztteam_fb_accounts.findMany({
      where: { owner_user_id: userId },
      select: { id: true },
    });
    const accountIds = fbAccounts.map(a => a.id);

    const pageWhere: any = { fb_account_id: { in: accountIds } };
    if (pageId) pageWhere.id = pageId;

    const pages = await this.prisma.ztteam_pages.findMany({
      where: pageWhere,
      select: { id: true },
    });
    const pageIds = pages.map(p => p.id);
    const totalPages = pageIds.length;

    /** 2. Get user's target sites and sources */
    const siteWhere: any = { owner_user_id: userId };
    if (siteId) siteWhere.id = siteId;

    const targetSites = await this.prisma.ztteam_target_sites.findMany({
      where: siteWhere,
      select: { id: true },
    });
    const siteIds = targetSites.map(s => s.id);

    const sources = await this.prisma.ztteam_crawl_sources.findMany({
      where: { target_site_id: { in: siteIds } },
      select: { id: true },
    });
    const sourceIds = sources.map(s => s.id);

    const totalCrawled = await this.prisma.ztteam_crawl_history.count({
      where: { source_id: { in: sourceIds } },
    });

    /** 3. Reels Stats */
    const totalReelsCreated = await this.prisma.ztteam_reels.count({
      where: { page_id: { in: pageIds } },
    });

    const totalReelsPublished = await this.prisma.ztteam_reels.count({
      where: { page_id: { in: pageIds }, is_posted: true },
    });

    const totalFailed = await this.prisma.ztteam_reels.count({
      where: { page_id: { in: pageIds }, status: 'FAILED' },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const crawledToday = await this.prisma.ztteam_crawl_history.count({
      where: {
        source_id: { in: sourceIds },
        created_at: { gte: today },
      },
    });

    const publishedToday = await this.prisma.ztteam_reels.count({
      where: {
        page_id: { in: pageIds },
        is_posted: true,
        updated_at: { gte: today },
      },
    });

    const successRate = totalReelsCreated > 0 
      ? Math.round((totalReelsPublished / (totalReelsPublished + totalFailed || 1)) * 100) 
      : 100;

    /** 4. Alerts */
    const expiredPages = await this.prisma.ztteam_pages.findMany({
      where: { fb_account_id: { in: accountIds }, token_status: { not: 'active' } },
      select: { name: true }
    });
    
    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);
    const failedReelsToday = await this.prisma.ztteam_reels.count({
      where: { page_id: { in: pageIds }, status: 'FAILED', updated_at: { gte: startOfDay } }
    });

    const alerts = [];
    if (expiredPages.length > 0) {
      alerts.push({
        type: 'TOKEN_EXPIRED',
        title: 'Token Facebook Hết Hạn',
        message: `${expiredPages.length} Facebook Page (${expiredPages.map(p => p.name).join(', ')}) yêu cầu xác thực lại token.`
      });
    }
    if (failedReelsToday > 0) {
      alerts.push({
        type: 'RENDER_ERROR',
        title: 'AI Render Error',
        message: `${failedReelsToday} Job AI Reel Factory đang bị lỗi hôm nay.`
      });
    }

    /** 5. Recent Activities */
    const recentReels = await this.prisma.ztteam_reels.findMany({
      where: { page_id: { in: pageIds } },
      orderBy: { updated_at: 'desc' },
      take: 20,
      include: { page: true }
    });

    const recentImages = await this.prisma.ztteam_images.findMany({
      where: { page_id: { in: pageIds } },
      orderBy: { updated_at: 'desc' },
      take: 20,
      include: { page: true }
    });

    const recentCrawls = await this.prisma.ztteam_crawl_history.findMany({
      where: { source_id: { in: sourceIds }, status: 'SUCCESS' },
      orderBy: { created_at: 'desc' },
      take: 20,
      include: { source: { include: { target_site: true } } }
    });

    const activities: any[] = [];
    
    recentCrawls.forEach(c => {
      activities.push({
        id: `crawl_${c.id}`,
        type: 'CRAWL',
        title: c.title || 'Bài viết mới',
        status: c.status,
        date: c.created_at,
        sourceName: c.source?.source_url || '',
        targetSiteName: c.source?.target_site?.wp_url || ''
      });
    });

    recentReels.forEach(r => {
      activities.push({
        id: `vid_create_${r.id}`,
        type: 'CREATE_VIDEO',
        title: r.wp_post_title || 'Video không tiêu đề',
        status: r.status,
        date: r.created_at,
        pageName: r.page?.name || ''
      });
      if (r.is_posted && r.posted_at) {
        activities.push({
          id: `vid_post_${r.id}`,
          type: 'POST_FACEBOOK',
          title: r.wp_post_title || 'Video',
          status: 'POSTED',
          date: r.posted_at,
          pageName: r.page?.name || '',
          pageAvatar: r.page?.avatar || '',
          postUrl: r.fb_post_id ? `https://facebook.com/${r.fb_post_id}` : ''
        });
      }
    });

    recentImages.forEach(img => {
      activities.push({
        id: `img_create_${img.id}`,
        type: 'CREATE_IMAGE',
        title: img.wp_post_title || 'Ảnh không tiêu đề',
        status: img.status,
        date: img.created_at,
        pageName: img.page?.name || ''
      });
      if (img.is_posted && img.posted_at) {
        activities.push({
          id: `img_post_${img.id}`,
          type: 'POST_FACEBOOK',
          title: img.wp_post_title || 'Ảnh',
          status: 'POSTED',
          date: img.posted_at,
          pageName: img.page?.name || '',
          pageAvatar: img.page?.avatar || '',
          postUrl: img.fb_post_id ? `https://facebook.com/${img.fb_post_id}` : ''
        });
      }
    });

    activities.sort((a, b) => b.date.getTime() - a.date.getTime());
    const topActivities = activities.slice(0, 20);

    /** 6. System Health */
    const queuedReels = await this.prisma.ztteam_reels.count({
      where: { page_id: { in: pageIds }, status: 'QUEUED' }
    });
    
    const health = {
      crawler: { status: 'Hoạt động', details: 'OK' },
      factory: { status: 'Đang xử lý', details: `${queuedReels} luồng đang chờ` },
      publisher: { status: 'Sẵn sàng', details: `Queue: ${queuedReels}` }
    };

    return {
      totalPages,
      totalCrawled,
      totalReelsCreated,
      totalReelsPublished,
      successRate,
      alerts,
      activities: topActivities,
      health
    };
  }

  async ztteam_getChartData(userId: string, days: number = 7, pageId?: string, siteId?: string) {
    const fbAccounts = await this.prisma.ztteam_fb_accounts.findMany({
      where: { owner_user_id: userId },
      select: { id: true },
    });
    const accountIds = fbAccounts.map(a => a.id);
    
    const pageWhere: any = { fb_account_id: { in: accountIds } };
    if (pageId) pageWhere.id = pageId;

    const pages = await this.prisma.ztteam_pages.findMany({
      where: pageWhere,
      select: { id: true, name: true, avatar: true, fb_page_id: true, page_token_encrypted: true },
    });
    const pageIds = pages.map(p => p.id);

    const siteWhere: any = { owner_user_id: userId };
    if (siteId) siteWhere.id = siteId;

    const targetSites = await this.prisma.ztteam_target_sites.findMany({
      where: siteWhere,
      select: { id: true, wp_url: true },
    });
    const siteIds = targetSites.map(s => s.id);
    
    const sources = await this.prisma.ztteam_crawl_sources.findMany({
      where: { target_site_id: { in: siteIds } },
      select: { id: true, target_site_id: true },
    });
    const sourceIds = sources.map(s => s.id);

    /** Build mappings and distinct names for initializing 0 */
    const sourceToSiteName = new Map<string, string>();
    const allSiteNames = new Set<string>();
    sources.forEach(s => {
      const site = targetSites.find(ts => ts.id === s.target_site_id);
      if (site) {
        const cleanName = site.wp_url.replace(/^https?:\/\//, '').replace(/\/$/, '');
        sourceToSiteName.set(s.id, cleanName);
        allSiteNames.add(cleanName);
      }
    });

    const allPageNames = pages.map(p => p.name);

    const chartData = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const startOfDay = new Date(d.setHours(0,0,0,0));
      const endOfDay = new Date(d.setHours(23,59,59,999));

      const dailyCrawledRaw = await this.prisma.ztteam_crawl_history.groupBy({
        by: ['source_id'],
        where: {
          source_id: { in: sourceIds },
          created_at: { gte: startOfDay, lte: endOfDay },
          status: 'SUCCESS'
        },
        _count: { id: true }
      });

      const dailyCreatedRaw = await this.prisma.ztteam_reels.groupBy({
        by: ['page_id'],
        where: {
          page_id: { in: pageIds },
          created_at: { gte: startOfDay, lte: endOfDay }
        },
        _count: { id: true }
      });

      const dailyPublishedRaw = await this.prisma.ztteam_reels.groupBy({
        by: ['page_id'],
        where: {
          page_id: { in: pageIds },
          is_posted: true,
          updated_at: { gte: startOfDay, lte: endOfDay }
        },
        _count: { id: true }
      });

      const dataPoint: any = { name: dateStr.split('-').slice(1).join('/') };
      
      /** Initialize ALL sites and pages to 0 for Recharts continuous rendering */
      allSiteNames.forEach(siteName => dataPoint[`crawl_${siteName}`] = 0);
      allPageNames.forEach(pageName => {
        dataPoint[`pub_${pageName}`] = 0;
        dataPoint[`create_${pageName}`] = 0;
      });
      
      let totalCrawledForDay = 0;
      dailyCrawledRaw.forEach(c => {
        const siteName = sourceToSiteName.get(c.source_id);
        if (siteName) dataPoint[`crawl_${siteName}`] += c._count.id;
        totalCrawledForDay += c._count.id;
      });

      let totalPublishedForDay = 0;
      dailyPublishedRaw.forEach(p => {
        const page = pages.find(pg => pg.id === p.page_id);
        if (page) dataPoint[`pub_${page.name}`] += p._count.id;
        totalPublishedForDay += p._count.id;
      });

      let totalCreatedForDay = 0;
      dailyCreatedRaw.forEach(r => {
        const page = pages.find(pg => pg.id === r.page_id);
        if (page) dataPoint[`create_${page.name}`] += r._count.id;
        totalCreatedForDay += r._count.id;
      });
      
      dataPoint['crawled'] = totalCrawledForDay;
      dataPoint['created'] = totalCreatedForDay;
      dataPoint['published'] = totalPublishedForDay;

      chartData.push(dataPoint);
    }

    const leaderboard = [];
    for (const page of pages) {
      const pageReels = await this.prisma.ztteam_reels.groupBy({
        by: ['status', 'is_posted'],
        where: { page_id: page.id, OR: [{ is_posted: true }, { status: 'FAILED' }] },
        _count: { id: true }
      });
      let published = 0;
      let failed = 0;
      pageReels.forEach(r => {
        if (r.is_posted) published += r._count.id;
        if (r.status === 'FAILED') failed += r._count.id;
      });

      if (published > 0 || failed > 0) {
        leaderboard.push({
          pageId: page.id,
          pageName: page.name,
          avatar: page.avatar,
          totalReels: published + failed,
          published,
          rate: Math.round((published / (published + failed)) * 100),
          fbPageId: page.fb_page_id,
          pageToken: page.page_token_encrypted,
          interactions: 0
        });
      }
    }
    leaderboard.sort((a, b) => b.published - a.published);
    const topLeaderboard = leaderboard.slice(0, 10);
    
    /** Interactions cho Leaderboard (chỉ đếm video/ảnh) */
    await Promise.all(topLeaderboard.map(async (item) => {
      try {
        /** Fallback or multiple fetches. We fetch recent 30 posts to calculate interactions */
        const res = await fetch(`https://graph.facebook.com/v19.0/${item.fbPageId}/published_posts?fields=id,reactions.summary(true),comments.summary(true),shares,attachments&limit=30&access_token=${item.pageToken}`);
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          let totalEngagements = 0;
          json.data.forEach((post: any) => {
            /** Check if it's a video or photo by attachments */
            let isMedia = false;
            if (post.attachments && post.attachments.data) {
              const type = post.attachments.data[0]?.type;
              const media_type = post.attachments.data[0]?.media_type;
              if (type?.includes('video') || type?.includes('photo') || media_type === 'video' || media_type === 'photo') {
                 isMedia = true;
              }
            } else {
              isMedia = true; /** Fallback to true if attachments are omitted */
            }
            if (isMedia) {
              const reactions = post.reactions?.summary?.total_count || 0;
              const comments = post.comments?.summary?.total_count || 0;
              const shares = post.shares?.count || 0;
              totalEngagements += (reactions + comments + shares);
            }
          });
          item.interactions = totalEngagements;
        }
      } catch(e) { /* ignore */ }
    }));

    /** Báo cáo chi tiết: Highlighted Posts bằng cách gọi trực tiếp ztteam_getTopPosts từ FacebookService */
    let highlightedPosts: any[] = [];
    
    /** We only fetch for the top 5 active pages to avoid rate limits and slow API responses */
    const activePages = topLeaderboard.slice(0, 5);
    
    await Promise.all(activePages.map(async (pageInfo) => {
      try {
        const topPosts = await this.facebookService.ztteam_getTopPosts(pageInfo.fbPageId, userId);
        const mappedPosts = topPosts.map((post: any) => ({
          id: post.id,
          title: post.message || 'Không có tiêu đề',
          thumbnail: post.full_picture || 'https://placehold.co/1080x1920/2563eb/white?text=No+Thumb',
          pageName: pageInfo.pageName,
          date: post.created_time,
          views: post.views,
          reactions: post.reactions || post.engagements, /** Fallback to engagements if reactions is 0 */
          videoUrl: ''
        }));
        highlightedPosts = [...highlightedPosts, ...mappedPosts];
      } catch (error) {
        this.logger.warn(`Could not fetch top posts for page ${pageInfo.pageName}`);
      }
    }));
    
    /** Sắp xếp các post của TẤT CẢ các page lại với nhau theo views (hoặc engagements) */
    /** Để "trùng với chỗ thống kê bên page" mà họ hay nhìn, bên kia sắp xếp theo engagements! */
    highlightedPosts.sort((a, b) => b.views - a.views);
    /** Take the top 15 across all pages */
    highlightedPosts = highlightedPosts.slice(0, 15);

    return {
      chartData,
      details: highlightedPosts,
      leaderboard: topLeaderboard
    };
  }
}
