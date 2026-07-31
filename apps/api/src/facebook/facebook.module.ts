import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ZTTeamFacebookService } from './facebook.service';
import { ZTTeamFacebookController } from './facebook.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ZTTeamUsersModule } from '../users/users.module';

@Module({
  imports: [HttpModule, PrismaModule, ZTTeamUsersModule],
  providers: [ZTTeamFacebookService],
  controllers: [ZTTeamFacebookController],
  exports: [ZTTeamFacebookService],
})
export class ZTTeamFacebookModule {}
