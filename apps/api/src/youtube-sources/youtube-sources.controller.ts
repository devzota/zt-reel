import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { YoutubeSourcesService } from './youtube-sources.service';
import { YoutubeCrawlerService } from './youtube.crawler.service';
import { ZTTeamAuthGuard } from '../auth/auth.guard';

@UseGuards(ZTTeamAuthGuard)
@Controller('youtube-sources')
export class YoutubeSourcesController {
  constructor(
    private readonly youtubeSourcesService: YoutubeSourcesService,
    private readonly youtubeCrawlerService: YoutubeCrawlerService
  ) {}

  @Post('test-crawl')
  async testCrawl() {
    this.youtubeCrawlerService.handleCron();
    return { success: true, message: 'Đã gửi lệnh Crawler, vui lòng xem Log hoặc vào mục Video' };
  }

  @Post('clear-history')
  async clearHistory() {
    return this.youtubeSourcesService.clearHistory();
  }

  @Post('test-render-url')
  async testRenderUrl(@Body() body: { pageId: string, url: string }) {
    if (!body.pageId || !body.url) {
      return { success: false, message: 'Thiếu pageId hoặc url' };
    }
    
    const result = await this.youtubeCrawlerService.processSingleUrl(body.url, body.pageId);
    
    if (result) {
      return { success: true, message: 'Đã đưa video vào hàng đợi Render!' };
    } else {
      return { success: false, message: 'Lỗi tải video hoặc video đã tồn tại trong lịch sử' };
    }
  }

  @Get()
  async findAll(@Request() req: any) {
    const data = await this.youtubeSourcesService.findAll(req.user.sub);
    return { success: true, data };
  }

  @Post()
  async create(@Request() req: any, @Body() body: { name: string; source_type: string; url: string }) {
    const data = await this.youtubeSourcesService.create(body, req.user.sub);
    return { success: true, data, message: 'Tạo nguồn YouTube thành công' };
  }

  @Put(':id')
  async update(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    const data = await this.youtubeSourcesService.update(id, body, req.user.sub);
    return { success: true, data, message: 'Cập nhật thành công' };
  }

  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    await this.youtubeSourcesService.remove(id, req.user.sub);
    return { success: true, message: 'Xóa nguồn thành công' };
  }
}
