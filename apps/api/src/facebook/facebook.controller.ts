import { Body, Controller, Post, Get, Param, UseGuards, Request, Put, Delete } from '@nestjs/common';
import { ZTTeamFacebookService } from './facebook.service';
import { ZTTeamAuthGuard } from '../auth/auth.guard';

@Controller('facebook')
@UseGuards(ZTTeamAuthGuard)
export class ZTTeamFacebookController {
  constructor(private facebookService: ZTTeamFacebookService) {}

  @Post('exchange-token')
  ztteam_exchangeToken(@Body() body: { shortToken: string }, @Request() req: any) {
    return this.facebookService.ztteam_exchangeLongLivedToken(body.shortToken, req.user.sub);
  }

  @Post('pages/:fbAccountId/fetch')
  ztteam_fetchPages(@Param('fbAccountId') fbAccountId: string, @Request() req: any) {
    return this.facebookService.ztteam_fetchPages(fbAccountId, req.user.sub);
  }

  @Get('pages')
  ztteam_getPages(@Request() req: any) {
    return this.facebookService.ztteam_getConnectedPages(req.user.sub);
  }

  @Post('pages/:pageId/test-post')
  ztteam_testPost(@Param('pageId') pageId: string, @Body() body: { message: string }, @Request() req: any) {
    return this.facebookService.ztteam_testPost(pageId, req.user.sub, body.message);
  }

  @Put('pages/:pageId/settings')
  ztteam_updatePageSettings(@Param('pageId') pageId: string, @Body() body: any, @Request() req: any) {
    return this.facebookService.ztteam_updatePageSettings(pageId, req.user.sub, body);
  }

  @Get('pages/:pageId/settings')
  ztteam_getPageSettings(@Param('pageId') pageId: string, @Request() req: any) {
    return this.facebookService.ztteam_getPageSettings(pageId, req.user.sub);
  }

  @Get('pages/:pageId/report')
  ztteam_getPageReport(@Param('pageId') pageId: string, @Request() req: any) {
    return this.facebookService.ztteam_getPageInsights(pageId, req.user.sub);
  }

  @Get('pages/:pageId/top-posts')
  ztteam_getTopPosts(@Param('pageId') pageId: string, @Request() req: any) {
    return this.facebookService.ztteam_getTopPosts(pageId, req.user.sub);
  }

  @Delete('pages/:pageId')
  ztteam_deletePage(@Param('pageId') pageId: string, @Request() req: any) {
    return this.facebookService.ztteam_deletePage(pageId, req.user.sub);
  }
}
