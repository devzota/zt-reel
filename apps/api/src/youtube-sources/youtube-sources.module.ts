import { Module } from '@nestjs/common';
import { YoutubeSourcesController } from './youtube-sources.controller';
import { YoutubeSourcesService } from './youtube-sources.service';
import { YoutubeCrawlerService } from './youtube.crawler.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ZTTeamRenderModule } from '../render/render.module';

@Module({
  imports: [PrismaModule, ZTTeamRenderModule],
  controllers: [YoutubeSourcesController],
  providers: [YoutubeSourcesService, YoutubeCrawlerService],
  exports: [YoutubeSourcesService]
})
export class YoutubeSourcesModule {}
