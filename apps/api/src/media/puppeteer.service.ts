import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as path from 'path';

/**
 * ZTTeamPuppeteerService — Renders HTML templates into transparent PNG overlays.
 * Uses headless Chromium to capture a single screenshot of the template layout.
 */
@Injectable()
export class ZTTeamPuppeteerService {
  private readonly logger = new Logger('ZTTeamPuppeteerService');

  /**
   * Render a template HTML string into a transparent PNG overlay.
   * The template is rendered at 1080x1920 (full reel resolution).
   * Only captures elements like logo, header, breaking text — the video area is left transparent.
   *
   * @param htmlContent - The complete HTML template (with CSS included)
   * @param outputPath - Where to save the overlay PNG
   */
  async ztteam_renderOverlay(htmlContent: string, outputPath: string): Promise<void> {
    this.logger.log('Launching Puppeteer for overlay render...');

    let browser: puppeteer.Browser | null = null;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage',
        ],
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });

      /**
       * Wrap the template HTML in a full page with transparent background.
       * The video-frame element is made fully transparent so only
       * the text overlay elements (header, breaking, hook) are captured.
       */
      const wrappedHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            html, body { margin: 0; padding: 0; width: 1080px; height: 1920px; background: transparent !important; }
            .video-frame { background: transparent !important; }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
        </html>
      `;

      await page.setContent(wrappedHtml, { waitUntil: 'domcontentloaded', timeout: 15000 });

      /** Wait a bit for fonts/CSS to load */
      await new Promise(resolve => setTimeout(resolve, 500));

      /** Screenshot with transparent background */
      await page.screenshot({
        path: outputPath,
        omitBackground: true,
        type: 'png',
      });

      this.logger.log(`Overlay rendered: ${outputPath}`);
    } catch (error: any) {
      this.logger.error(`Puppeteer render failed: ${error.message}`);
      throw new Error('Lỗi render overlay: ' + error.message);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}
