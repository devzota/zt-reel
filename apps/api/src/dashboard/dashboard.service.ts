import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ZTTeamDashboardService {
  private readonly logger = new Logger(ZTTeamDashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

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
      where: { page_id: { in: pageIds }, status: 'POSTED' },
    });

    const totalFailed = await this.prisma.ztteam_reels.count({
      where: { page_id: { in: pageIds }, status: 'FAILED' },
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
      take: 5,
      include: { page: true }
    });

    const recentCrawls = await this.prisma.ztteam_crawl_history.findMany({
      where: { source_id: { in: sourceIds } },
      orderBy: { created_at: 'desc' },
      take: 5,
      include: { source: true }
    });

    const activities = [
      ...recentReels.map(r => ({
        id: r.id,
        type: 'REEL',
        title: r.wp_post_title || 'Video không tiêu đề',
        status: r.status,
        date: r.updated_at,
        pageName: r.page?.name || ''
      })),
      ...recentCrawls.map(c => ({
        id: c.id,
        type: 'CRAWL',
        title: c.title || 'Bài viết mới',
        status: c.status,
        date: c.created_at,
        sourceName: c.source?.source_url || ''
      }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);

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
      activities,
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
      select: { id: true, name: true, avatar: true },
    });
    const pageIds = pages.map(p => p.id);

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

    const chartData = [];
    const details = [];

    /** Tối ưu: Dùng Group By của Prisma thay vì đếm trong vòng lặp N ngày (N truy vấn) */
    /** Hoặc lấy tất cả data trong khoảng thời gian rồi filter bằng JS */
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0,0,0,0);

    const reelsStats = await this.prisma.ztteam_reels.groupBy({
      by: ['status'],
      where: {
        page_id: { in: pageIds },
      },
      _count: { id: true },
    });

    /** Lấy Leaderboard (bằng aggregate count) */
    const leaderboard = [];
    for (const page of pages) {
      const pageReels = await this.prisma.ztteam_reels.groupBy({
        by: ['status'],
        where: { page_id: page.id, status: { in: ['POSTED', 'FAILED'] } },
        _count: { id: true }
      });
      let published = 0;
      let failed = 0;
      pageReels.forEach(r => {
        if (r.status === 'POSTED') published = r._count.id;
        if (r.status === 'FAILED') failed = r._count.id;
      });

      if (published > 0 || failed > 0) {
        leaderboard.push({
          pageName: page.name,
          avatar: page.avatar,
          totalReels: published + failed,
          published,
          rate: Math.round((published / (published + failed)) * 100)
        });
      }
    }
    leaderboard.sort((a, b) => b.published - a.published);

    /** Tính Details cho N ngày */
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const startOfDay = new Date(d.setHours(0,0,0,0));
      const endOfDay = new Date(d.setHours(23,59,59,999));

      const crawled = await this.prisma.ztteam_crawl_history.count({
        where: {
          source_id: { in: sourceIds },
          created_at: { gte: startOfDay, lte: endOfDay }
        }
      });

      const published = await this.prisma.ztteam_reels.count({
        where: {
          page_id: { in: pageIds },
          status: 'POSTED',
          updated_at: { gte: startOfDay, lte: endOfDay }
        }
      });

      const failed = await this.prisma.ztteam_reels.count({
        where: {
          page_id: { in: pageIds },
          status: 'FAILED',
          updated_at: { gte: startOfDay, lte: endOfDay }
        }
      });

      chartData.push({
        name: dateStr.split('-').slice(1).join('/'),
        crawled,
        published
      });

      details.push({
        date: dateStr,
        crawled,
        published,
        failed,
        successRate: crawled > 0 || published > 0 ? Math.round((published / (published + failed || 1)) * 100) : 0
      });
    }

    return {
      chartData,
      details: details.reverse(),
      leaderboard: leaderboard.slice(0, 10)
    };
  }
}
