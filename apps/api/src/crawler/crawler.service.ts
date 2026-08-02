import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ZTTeamCrawlerService {
  private readonly logger = new Logger(ZTTeamCrawlerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async ztteam_createSource(siteId: string, data: { sourceUrl: string; sourceCategory: string; frequencyCron: string }) {
    try {
      return await this.prisma.ztteam_crawl_sources.create({
        data: {
          target_site_id: siteId,
          source_url: data.sourceUrl,
          source_category: data.sourceCategory,
          extract_rules_json: '{}', /** Automatic extraction used instead */
          frequency_cron: data.frequencyCron,
          enabled: true
        }
      });
    } catch (error: any) {
      this.logger.error('Failed to create crawl source', error);
      throw new HttpException('Failed to create crawl source', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async ztteam_updateSource(sourceId: string, data: { sourceUrl: string; sourceCategory: string; frequencyCron: string }) {
    return this.prisma.ztteam_crawl_sources.update({
      where: { id: sourceId },
      data: {
        source_url: data.sourceUrl,
        source_category: data.sourceCategory,
        frequency_cron: data.frequencyCron,
      }
    });
  }

  async ztteam_getSources(siteId: string) {
    const sources = await this.prisma.ztteam_crawl_sources.findMany({
      where: { target_site_id: siteId },
      orderBy: { created_at: 'desc' },
      include: {
        history: {
          orderBy: { created_at: 'desc' },
          take: 1
        }
      }
    });

    return sources.map((source: any) => {
      const lastCrawl = source.history && source.history.length > 0 ? source.history[0].created_at : null;
      let nextCrawl = null;
      
      if (source.enabled) {
        let intervalMs = 1 * 60 * 60 * 1000;
        switch (source.frequency_cron) {
          case '0 */5 * * * *': intervalMs = 5 * 60 * 1000; break;
          case '0 */15 * * * *': intervalMs = 15 * 60 * 1000; break;
          case '0 */30 * * * *': intervalMs = 30 * 60 * 1000; break;
          case '0 */1 * * *': intervalMs = 1 * 60 * 60 * 1000; break;
          case '0 */2 * * *': intervalMs = 2 * 60 * 60 * 1000; break;
          case '0 */3 * * *': intervalMs = 3 * 60 * 60 * 1000; break;
          case '0 */6 * * *': intervalMs = 6 * 60 * 60 * 1000; break;
          case '0 */12 * * *': intervalMs = 12 * 60 * 60 * 1000; break;
          case '0 0 * * *': intervalMs = 24 * 60 * 60 * 1000; break;
        }
        
        if (lastCrawl) {
          nextCrawl = new Date(new Date(lastCrawl).getTime() + intervalMs);
        } else {
          nextCrawl = new Date();
        }
      }

      const { history, ...rest } = source;
      return {
        ...rest,
        last_crawled_at: lastCrawl,
        next_crawl_at: nextCrawl
      };
    });
  }

  async ztteam_deleteSource(sourceId: string) {
    return this.prisma.ztteam_crawl_sources.delete({
      where: { id: sourceId }
    });
  }

  async ztteam_toggleSource(sourceId: string, enabled: boolean) {
    return this.prisma.ztteam_crawl_sources.update({
      where: { id: sourceId },
      data: { enabled }
    });
  }

  async ztteam_getHistory(sourceId: string, limit = 50) {
    return this.prisma.ztteam_crawl_history.findMany({
      where: { source_id: sourceId },
      orderBy: { created_at: 'desc' },
      take: limit
    });
  }
}
