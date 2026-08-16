import { Module } from '@nestjs/common';
import { TiktokCloneController } from './tiktok-clone.controller';
import { ZTTeamAIModule } from '../ai/ai.module';
import { ZTTeamAudioModule } from '../audio/audio.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ZTTeamMediaModule } from '../media/media.module';

@Module({
  imports: [ZTTeamAIModule, ZTTeamAudioModule, PrismaModule, ZTTeamMediaModule],
  controllers: [TiktokCloneController],
})
export class TiktokCloneModule {}
