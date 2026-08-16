import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { ztteam_getReelsPath } from '../common/ztteam_storage.util';

@Injectable()
export class YoutubeSourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.ztteam_youtube_sources.findMany({
      where: { owner_user_id: userId },
      orderBy: { created_at: 'desc' }
    });
  }

  async findOne(id: string, userId: string) {
    const source = await this.prisma.ztteam_youtube_sources.findFirst({
      where: { id, owner_user_id: userId }
    });
    if (!source) throw new NotFoundException('Không tìm thấy nguồn YouTube này');
    return source;
  }

  async create(data: { name: string; source_type: string; url: string }, userId: string) {
    return this.prisma.ztteam_youtube_sources.create({
      data: {
        name: data.name,
        source_type: data.source_type,
        url: data.url,
        owner_user_id: userId
      }
    });
  }

  async update(id: string, data: { name?: string; source_type?: string; url?: string; is_active?: boolean }, userId: string) {
    const source = await this.findOne(id, userId);
    return this.prisma.ztteam_youtube_sources.update({
      where: { id: source.id },
      data
    });
  }

  async remove(id: string, userId: string) {
    const source = await this.findOne(id, userId);
    return this.prisma.ztteam_youtube_sources.delete({
      where: { id: source.id }
    });
  }

  async clearHistory() {
    await this.prisma.ztteam_reel_history.deleteMany({
      where: { wp_post_id: { contains: 'youtu' } }
    });
    
    /** Lấy danh sách để xóa file */
    const reelsToDelete = await this.prisma.ztteam_reels.findMany({
      where: { source_type: 'YOUTUBE' },
      select: { id: true }
    });

    /** Xóa trong DB */
    await this.prisma.ztteam_reels.deleteMany({
      where: { source_type: 'YOUTUBE' }
    });
    
    /** Xóa file vật lý và dọn dẹp thư mục mồ côi (orphans) */
    let deletedFiles = 0;
    
    /** Xóa theo danh sách vừa xóa trong DB */
    for (const reel of reelsToDelete) {
      const reelDir = ztteam_getReelsPath(reel.id);
      if (fs.existsSync(reelDir)) {
        try {
          fs.rmSync(reelDir, { recursive: true, force: true });
          deletedFiles++;
        } catch (e) {
          /** Bỏ qua lỗi */
        }
      }
    }

    /** Xóa các thư mục mồ côi (do các lần xóa thủ công trước đây) */
    const allReels = await this.prisma.ztteam_reels.findMany({ select: { id: true } });
    const dbSet = new Set(allReels.map(r => r.id));
    const storageDir = ztteam_getReelsPath();
    
    if (fs.existsSync(storageDir)) {
      const dirs = fs.readdirSync(storageDir);
      for (const d of dirs) {
        /** Bỏ qua nếu là file, chỉ xử lý thư mục */
        const dirPath = path.join(storageDir, d);
        if (fs.statSync(dirPath).isDirectory() && !dbSet.has(d)) {
          try {
            fs.rmSync(dirPath, { recursive: true, force: true });
            deletedFiles++;
          } catch(e) {}
        }
      }
    }
    
    return { success: true, message: `Đã dọn dẹp sạch sẽ dữ liệu video lỗi (đã xóa ${deletedFiles} thư mục)` };
  }
}
