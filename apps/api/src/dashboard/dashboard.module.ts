import { Module } from '@nestjs/common';
import { ZTTeamDashboardController } from './dashboard.controller';
import { ZTTeamDashboardService } from './dashboard.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ZTTeamDashboardController],
  providers: [ZTTeamDashboardService],
})
export class ZTTeamDashboardModule {}
