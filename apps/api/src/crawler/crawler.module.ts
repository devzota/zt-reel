import { Module } from '@nestjs/common';
import { ZTTeamCrawlerService } from './crawler.service';
import { ZTTeamCrawlerController } from './crawler.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ZTTeamFetcherService } from './fetcher.service';
import { ZTTeamCrawlerCron } from './crawler.cron';
import { ZTTeamWordpressModule } from '../wordpress/wordpress.module';

@Module({
  imports: [PrismaModule, ZTTeamWordpressModule],
  providers: [ZTTeamCrawlerService, ZTTeamFetcherService, ZTTeamCrawlerCron],
  controllers: [ZTTeamCrawlerController],
  exports: [ZTTeamFetcherService]
})
export class ZTTeamCrawlerModule {}
