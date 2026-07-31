import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, ztteam_users } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ZTTeamUsersService {
  constructor(private prisma: PrismaService) {}

  async ztteam_findByEmail(email: string): Promise<ztteam_users | null> {
    return this.prisma.ztteam_users.findUnique({
      where: { email },
    });
  }

  async ztteam_findById(id: string): Promise<ztteam_users | null> {
    return this.prisma.ztteam_users.findUnique({
      where: { id },
    });
  }

  async ztteam_create(data: Prisma.ztteam_usersCreateInput): Promise<ztteam_users> {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(data.password_hash, salt);
    
    return this.prisma.ztteam_users.create({
      data: {
        ...data,
        password_hash,
      },
    });
  }
}
