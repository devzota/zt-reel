import { Module } from '@nestjs/common';
import { ZTTeamTemplatesController } from './templates.controller';
import { ZTTeamTemplatesService } from './templates.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ZTTeamAuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, ZTTeamAuthModule],
  controllers: [ZTTeamTemplatesController],
  providers: [ZTTeamTemplatesService],
  exports: [ZTTeamTemplatesService],
})
export class ZTTeamTemplatesModule {}
