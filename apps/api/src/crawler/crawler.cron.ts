import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ZTTeamFetcherService } from './fetcher.service';
import { ZTTeamWordpressService } from '../wordpress/wordpress.service';
import Parser from 'rss-parser';

@Injectable()
export class ZTTeamCrawlerCron implements OnApplicationBootstrap {
  private readonly logger = new Logger(ZTTeamCrawlerCron.name);
  private rssParser: Parser;
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly fetcherService: ZTTeamFetcherService,
    private readonly wordpressService: ZTTeamWordpressService,
  ) {
    this.rssParser = new Parser({
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });
  }

  onApplicationBootstrap() {
    this.logger.log('Application started, triggering initial crawler run...');
    this.ztteam_handleCron();
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async ztteam_handleCron() {
    if (this.isRunning) {
      this.logger.warn('Crawler cron is already running, skipping this tick');
      return;
    }
    this.isRunning = true;
    this.logger.log('Starting Auto-Crawler Cron...');

    try {
      const sources = await this.prisma.ztteam_crawl_sources.findMany({
        where: { enabled: true },
        include: { target_site: true },
        take: 50, /** Batch limit */
      });

      for (const source of sources) {
        if (!source.target_site) continue;
        
        /** Determine the interval in milliseconds based on frequency_cron */
        let intervalMs = 0;
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
          default: intervalMs = 60 * 60 * 1000; /** Default 1 hour instead of 2 mins */
        }

        /** Check last crawl time */
        const lastCrawl = await this.prisma.ztteam_crawl_history.findFirst({
          where: { source_id: source.id },
          orderBy: { created_at: 'desc' }
        });

        if (lastCrawl) {
          const timeSinceLastCrawl = Date.now() - new Date(lastCrawl.created_at).getTime();
          if (timeSinceLastCrawl < intervalMs) {
            this.logger.debug(`Skipping source ${source.source_url} (Crawled recently. Next run in ${Math.round((intervalMs - timeSinceLastCrawl) / 60000)} mins)`);
            continue;
          }
        }

        this.logger.log(`Crawling source: ${source.source_url} for site: ${source.target_site.wp_url}`);
        
        try {
          await this.ztteam_crawlSource(source);
        } catch (error: any) {
          this.logger.error(`Failed to crawl source ${source.id}: ${error.message}`);
        }
      }
    } catch (error: any) {
      this.logger.error(`Crawler cron failed: ${error.message}`);
    } finally {
      this.isRunning = false;
      this.logger.log('Auto-Crawler Cron finished.');
    }
  }

  private async ztteam_crawlSource(source: any) {
    /** 1. Extract URLs from the source (Assuming it's an RSS feed for now) */
    const urlsToFetch: string[] = [];
    
    try {
      const feed = await this.rssParser.parseURL(source.source_url);
      if (feed.items && feed.items.length > 0) {
        /** Take the top 5 latest items to prevent overload */
        const items = feed.items.slice(0, 5);
        for (const item of items) {
          if (item.link) urlsToFetch.push(item.link);
        }
      }
    } catch (error: any) {
      this.logger.warn(`Failed to parse RSS for ${source.source_url}, falling back to HTML scraping: ${error.message}`);
      
      /** Fallback: fetch HTML and extract article links */
      try {
        const html = await this.fetcherService.ztteam_fetchHtml(source.source_url);
        const cheerio = require('cheerio');
        const $ = cheerio.load(html);
        
        /** Remove header, footer, nav, sidebars to avoid scraping "Page" links (About, Contact, Privacy) */
        $('header, footer, nav, aside, .sidebar, .widget, .menu, #menu, .nav-menu').remove();
        
        const baseUrl = new URL(source.source_url);
        const extractedUrls = new Set<string>();

        $('a').each((i: number, el: any) => {
          let href = $(el).attr('href');
          if (!href) return;
          
          try {
            /** Handle relative URLs */
            if (href.startsWith('/')) {
              href = `${baseUrl.origin}${href}`;
            }
            
            const linkUrl = new URL(href);
            
            /** Basic heuristics for an article link:
             * 1. Same domain
             * 2. Path is sufficiently long (usually > 15 chars for slug) or has hyphens
             * 3. Not a category, tag, author, or login page
             */
            if (linkUrl.hostname === baseUrl.hostname) {
              const path = linkUrl.pathname;
              if (
                path !== '/' &&
                path.length > 5 &&
                !path.includes('/category/') &&
                !path.includes('/tag/') &&
                !path.includes('/author/') &&
                !path.includes('/page/') &&
                !path.includes('/contact') &&
                !path.includes('/privacy') &&
                !path.includes('/terms') &&
                !path.includes('/about') &&
                !path.includes('wp-admin') &&
                !path.includes('wp-login')
              ) {
                extractedUrls.add(linkUrl.href);
              }
            }
          } catch (e) {
            /** Invalid URL, ignore */
          }
        });

        /** Take top 10 instead of 5 to get more articles */
        urlsToFetch.push(...Array.from(extractedUrls).slice(0, 10));
        
        if (urlsToFetch.length === 0) {
          this.logger.warn(`Could not find any article links on ${source.source_url}`);
        } else {
          this.logger.log(`Extracted ${urlsToFetch.length} links from ${source.source_url}`);
        }
      } catch (htmlError: any) {
        this.logger.error(`Failed to scrape HTML for ${source.source_url}: ${htmlError.message}`);
        urlsToFetch.push(source.source_url);
      }
    }

    if (urlsToFetch.length === 0) {
      this.logger.warn(`No URLs found for source ${source.source_url}`);
      return;
    }

    /** 2. Fetch data for each URL and post to WordPress */
    for (const url of urlsToFetch) {
      try {
        /** Check history */
        const history = await this.prisma.ztteam_crawl_history.findUnique({
          where: { source_id_url: { source_id: source.id, url } }
        });

        if (history) {
          /** Already processed this URL */
          continue;
        }

        const fetchedData = await this.fetcherService.ztteam_fetchUrlData(url);
        
        if (!fetchedData || !fetchedData.title || !fetchedData.content) {
          this.logger.warn(`Fetched data is incomplete for ${url}`);
          await this.prisma.ztteam_crawl_history.create({
            data: { source_id: source.id, url, status: 'FAILED' }
          });
          continue;
        }

        const result = await this.wordpressService.ztteam_createPost(source.target_site_id, {
          title: fetchedData.title,
          content: fetchedData.contentHtml || fetchedData.content,
          excerpt: fetchedData.excerpt,
          categories: source.source_category ? [Number(source.source_category)] : undefined,
          imageUrl: fetchedData.image || null
        });

        await this.prisma.ztteam_crawl_history.create({
          data: { source_id: source.id, url, title: fetchedData.title, status: 'SUCCESS' }
        });

        this.logger.log(`Successfully crawled and created post: ${fetchedData.title} -> ${result?.url || 'OK'}`);
      } catch (err: any) {
        this.logger.error(`Failed to process URL ${url}: ${err.message}`);
        try {
          await this.prisma.ztteam_crawl_history.upsert({
            where: { source_id_url: { source_id: source.id, url } },
            create: { source_id: source.id, url, status: 'FAILED' },
            update: { status: 'FAILED' }
          });
        } catch (e) {
          /** Ignore upsert error */
        }
      }
    }
    /** Update SYNC_CHECK record to mark the last time we checked this source */
    try {
      const syncUrl = 'SYNC_CHECK';
      const existingSync = await this.prisma.ztteam_crawl_history.findUnique({
        where: { source_id_url: { source_id: source.id, url: syncUrl } }
      });

      if (existingSync) {
        /** We use delete + create because updated_at is not available, and created_at is default(now()) */
        await this.prisma.ztteam_crawl_history.delete({
          where: { source_id_url: { source_id: source.id, url: syncUrl } }
        });
      }
      
      await this.prisma.ztteam_crawl_history.create({
        data: { source_id: source.id, url: syncUrl, status: 'SYNC' }
      });
    } catch (e) {
      /** Ignore */
    }
  }
}
