import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, UseInterceptors, UploadedFile, HttpException, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
/** @ts-ignore */
import { diskStorage } from 'multer';
import * as path from 'path';
import { ZTTeamTemplatesService } from './templates.service';
import { ZTTeamAuthGuard } from '../auth/auth.guard';
import { ztteam_getTemplatesPath } from '../common/ztteam_storage.util';
import OpenAI from 'openai';

@Controller('templates')
/** @UseGuards(ZTTeamAuthGuard) */
export class ZTTeamTemplatesController {

  constructor(private readonly templatesService: ZTTeamTemplatesService) {}

  @Get()
  ztteam_getTemplates(@Query('format') format?: string, @Query('pageId') pageId?: string) {
    return this.templatesService.ztteam_getTemplates(format, pageId);
  }

  @Get(':id')
  ztteam_getTemplate(@Param('id') id: string) {
    return this.templatesService.ztteam_getTemplate(id);
  }

  @Post()
  ztteam_createTemplate(@Body() body: any) {
    return this.templatesService.ztteam_createTemplate(body);
  }

  @Post('clone')
  ztteam_cloneTemplate(@Body() body: { templateId: string; pageId: string }) {
    return this.templatesService.ztteam_cloneTemplate(body.templateId, body.pageId);
  }

  /** @UseGuards(JwtAuthGuard) */
  @Put(':id')
  ztteam_updateTemplate(@Param('id') id: string, @Body() body: any) {
    return this.templatesService.ztteam_updateTemplate(id, body);
  }

  @Delete(':id')
  ztteam_deleteTemplate(@Param('id') id: string) {
    return this.templatesService.ztteam_deleteTemplate(id);
  }

  @Post(':id/duplicate')
  ztteam_duplicateTemplate(@Param('id') id: string) {
    return this.templatesService.ztteam_duplicateTemplate(id);
  }

  @Post(':id/upload-bg')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req: any, file: any, cb: any) => {
        cb(null, ztteam_getTemplatesPath());
      },
      filename: (req: any, file: any, cb: any) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, req.params.id + '-' + uniqueSuffix + path.extname(file.originalname));
      },
    }),
  }))
  async ztteam_uploadBg(@Param('id') id: string, @UploadedFile() file: any) {
    const url = `/storage/templates/${file.filename}`;
    return { url };
  }

  @Post('tts/test')
  async ztteam_testVoice(@Body() body: { voice: string, text: string }) {
    try {
      const settingsDb = await this.templatesService['prisma'].ztteam_settings.findUnique({
        where: { key: 'OPENAI_API_KEY' },
      });
      const apiKey = settingsDb?.value || process.env.OPENAI_API_KEY || '';

      if (!apiKey) {
        return { url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', message: 'MOCK AUDIO (No API Key)' };
      }
      
      const openai = new OpenAI({ apiKey });
      const mp3 = await openai.audio.speech.create({
        model: 'tts-1',
        voice: body.voice as any || 'alloy',
        input: body.text || 'Đây là bản nghe thử giọng đọc của hệ thống.',
      });
      const buffer = Buffer.from(await mp3.arrayBuffer());
      const base64 = buffer.toString('base64');
      return { url: `data:audio/mp3;base64,${base64}` };
    } catch (e: any) {
      throw new HttpException(
        e.response?.data?.error?.message || e.message || 'Lỗi tạo giọng đọc',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
