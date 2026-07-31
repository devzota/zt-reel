import { Module } from '@nestjs/common';
import { ZTTeamUsersService } from './users.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ZTTeamUsersService],
  exports: [ZTTeamUsersService],
})
export class ZTTeamUsersModule {}
