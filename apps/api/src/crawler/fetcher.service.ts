import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import * as cheerio from "cheerio";
import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";

export interface ZTTeamFetchResult {
  title: string;
  image: string | null;
  content: string;
  contentHtml: string;
  excerpt: string;
  siteName: string | null;
  url: string;
}

@Injectable()
export class ZTTeamFetcherService {
  private readonly logger = new Logger(ZTTeamFetcherService.name);

  async ztteam_fetchHtml(url: string): Promise<string> {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(15000), /** 15 seconds timeout */
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
          "Upgrade-Insecure-Requests": "1",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      return response.text();
    } catch (error: any) {
      this.logger.error(`Failed to fetch HTML from ${url}`, error.stack);
      throw new HttpException(`Cannot fetch URL: ${error.message}`, HttpStatus.BAD_REQUEST);
    }
  }

  private ztteam_extractOgImage($: any): string | null {
    return (
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      null
    );
  }

  private ztteam_extractSiteName($: any): string | null {
    return $('meta[property="og:site_name"]').attr("content") || null;
  }
  
  private ztteam_extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return 'Unknown';
    }
  }

  private ztteam_parseReadability(
    html: string,
    url: string,
  ): {
    title: string;
    content: string;
    contentHtml: string;
    excerpt: string;
  } {
    const { document } = parseHTML(html);
    /** Ignore read-only baseURI error by using Object.defineProperty */
    Object.defineProperty(document, 'baseURI', { value: url, writable: true });
    
    /** @ts-ignore - Readability types can be tricky */
    const reader = new Readability(document);
    const article = reader.parse();

    if (!article) {
      throw new Error("Không thể parse nội dung bài viết");
    }

    return {
      title: article.title || "",
      content:
        article.textContent
          ?.replace(/\t/g, " ")
          .replace(/[ ]{2,}/g, " ")
          .replace(/\. ([A-Z])/g, ".\n\n$1")
          .replace(/([.!?])\s+([A-Z])/g, "$1\n\n$2")
          .trim() || "",
      contentHtml: article.content || "",
      excerpt: article.excerpt || "",
    };
  }

  async ztteam_fetchUrlData(url: string): Promise<ZTTeamFetchResult> {
    try {
      /** Basic validation */
      new URL(url);
    } catch {
      throw new HttpException("URL không hợp lệ", HttpStatus.BAD_REQUEST);
    }

    const html = await this.ztteam_fetchHtml(url);
    const $ = cheerio.load(html);

    const image = this.ztteam_extractOgImage($);
    const siteName = this.ztteam_extractSiteName($);
    const { title, content, contentHtml, excerpt } = this.ztteam_parseReadability(
      html,
      url,
    );

    return {
      title,
      image,
      content,
      contentHtml,
      excerpt,
      siteName: siteName || this.ztteam_extractDomain(url),
      url,
    };
  }
}
