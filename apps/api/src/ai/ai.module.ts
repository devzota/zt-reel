import { Module } from '@nestjs/common';
import { ZTTeamAIService } from './ai.service';
import { ZTTeamAIController } from './ai.controller';

@Module({
  controllers: [ZTTeamAIController],
  providers: [ZTTeamAIService],
  exports: [ZTTeamAIService],
})
export class ZTTeamAIModule {}
