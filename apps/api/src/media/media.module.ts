import { Module } from '@nestjs/common';
import { ZTTeamFFmpegService } from './ffmpeg.service';
import { ZTTeamPuppeteerService } from './puppeteer.service';

@Module({
  providers: [ZTTeamFFmpegService, ZTTeamPuppeteerService],
  exports: [ZTTeamFFmpegService, ZTTeamPuppeteerService],
})
export class ZTTeamMediaModule {}
