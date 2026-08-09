import { Module } from '@nestjs/common';
import { ZTTeamFFmpegService } from './ffmpeg.service';
import { ZTTeamPuppeteerService } from './puppeteer.service';
import { ZTTeamYoutubeService } from './youtube.service';

@Module({
  providers: [ZTTeamFFmpegService, ZTTeamPuppeteerService, ZTTeamYoutubeService],
  exports: [ZTTeamFFmpegService, ZTTeamPuppeteerService, ZTTeamYoutubeService],
})
export class ZTTeamMediaModule {}
