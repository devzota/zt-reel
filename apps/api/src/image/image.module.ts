import { Module } from '@nestjs/common';
import { ZTTeamImageProcessor } from './image.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { ZTTeamAIModule } from '../ai/ai.module';
import { ZTTeamMediaModule } from '../media/media.module';
import { ZTTeamFacebookModule } from '../facebook/facebook.module';
import { ZTTeamWordpressModule } from '../wordpress/wordpress.module';
import { ZTTeamImageRenderCron } from './image-render.cron';
import { ZTTeamImagePublisherCron } from './image-publisher.cron';
import { ZTTeamImageController } from './image.controller';

@Module({
  imports: [
    PrismaModule, 
    ZTTeamAIModule, 
    ZTTeamMediaModule, 
    ZTTeamFacebookModule,
    ZTTeamWordpressModule
  ],
  controllers: [ZTTeamImageController],
  providers: [ZTTeamImageProcessor, ZTTeamImageRenderCron, ZTTeamImagePublisherCron],
  exports: [ZTTeamImageProcessor],
})
export class ZTTeamImageModule {}
