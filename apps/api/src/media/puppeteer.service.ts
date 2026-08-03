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
   * Render a template HTML string into a PNG image/overlay.
   *
   * @param htmlContent - The complete HTML template (with CSS included)
   * @param outputPath - Where to save the overlay PNG
   * @param width - Viewport width
   * @param height - Viewport height
   */
  async ztteam_renderOverlay(htmlContent: string, outputPath: string, width: number = 1080, height: number = 1920): Promise<void> {
    this.logger.log(`Launching Puppeteer for render (${width}x${height})...`);

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
      await page.setViewport({ width, height, deviceScaleFactor: 1 });

      /**
       * Wrap the template HTML in a full page with transparent background.
       */
      const wrappedHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            html, body { margin: 0; padding: 0; width: ${width}px; height: ${height}px; background: transparent !important; overflow: hidden; }
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
