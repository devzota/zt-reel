import { Controller, Post, Body, UseGuards, Request, Logger, HttpException, HttpStatus, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { ZTTeamAuthGuard } from '../auth/auth.guard';
import { ZTTeamAIService } from '../ai/ai.service';
import { ZTTeamTTSService } from '../audio/tts.service';
import { ZTTeamFFmpegService } from '../media/ffmpeg.service';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

@UseGuards(ZTTeamAuthGuard)
@Controller('tiktok-clone')
export class TiktokCloneController {
  private readonly logger = new Logger(TiktokCloneController.name);

  constructor(
    private readonly aiService: ZTTeamAIService,
    private readonly ttsService: ZTTeamTTSService,
    private readonly ffmpegService: ZTTeamFFmpegService,
  ) {}

  @Post('process')
  async processTiktok(@Request() req: any, @Body() body: { url: string; prompt?: string; voice_id?: string; voice_speed?: number }) {
    if (!body.url) {
      throw new HttpException('Vui lòng cung cấp link TikTok', HttpStatus.BAD_REQUEST);
    }

    const tempAudioPath = path.join(os.tmpdir(), `tiktok_audio_${crypto.randomUUID()}.mp3`);
    let outputAudioPath: string | null = null;
    
    try {
      this.logger.log(`Processing TikTok URL: ${body.url}`);
      
      /** 1. Get TikTok data from TikWM */
      const tikwmRes = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(body.url)}`);
      if (tikwmRes.data?.code === -1 || !tikwmRes.data?.data) {
        throw new Error('Không thể lấy thông tin video TikTok. Link có thể không hợp lệ hoặc video riêng tư.');
      }

      const musicUrl = tikwmRes.data.data.music || tikwmRes.data.data.play;
      if (!musicUrl) {
        throw new Error('Không tìm thấy link âm thanh từ video TikTok này.');
      }

      /** 2. Download audio to temp file */
      this.logger.log(`Downloading audio from: ${musicUrl}`);
      const audioResponse = await axios.get(musicUrl, { responseType: 'stream' });
      
      await new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(tempAudioPath);
        audioResponse.data.pipe(writer);
        writer.on('finish', () => resolve(true));
        writer.on('error', reject);
      });

      /** 3. Transcribe audio */
      const originalText = await this.aiService.ztteam_transcribeAudio(tempAudioPath);
      if (!originalText || originalText.trim().length === 0) {
        throw new Error('Không nghe được giọng nói nào trong video hoặc video chỉ có nhạc nền.');
      }

      /** 4. Rewrite script */
      const rewrittenScript = await this.aiService.ztteam_rewriteTikTokScript(originalText, body.prompt);

      /** 5. Test TTS */
      const voiceId = body.voice_id || 'onyx';
      const voiceSpeed = body.voice_speed || 1.1;
      
      const { ztteam_getStorageRoot } = require('../common/ztteam_storage.util');
      const workDir = path.join(ztteam_getStorageRoot(), 'tmp');
      if (!fs.existsSync(workDir)) {
        fs.mkdirSync(workDir, { recursive: true });
      }
      
      outputAudioPath = await this.ttsService.ztteam_textToSpeech(rewrittenScript.sub_voice, voiceId, workDir, voiceSpeed);
      
      /** Convert absolute path to relative public URL so frontend can play it */
      const relativeAudioUrl = '/storage/tmp/' + path.basename(outputAudioPath);

      return {
        success: true,
        data: {
          original_text: originalText,
          new_script: rewrittenScript,
          audio_url: relativeAudioUrl,
          tiktok_meta: {
            title: tikwmRes.data.data.title,
            cover: tikwmRes.data.data.cover
          }
        }
      };

    } catch (error: any) {
      this.logger.error(`Error processing TikTok: ${error.message}`);
      throw new HttpException(error.message || 'Lỗi không xác định', HttpStatus.INTERNAL_SERVER_ERROR);
    } finally {
      /** Cleanup original temp audio */
      if (fs.existsSync(tempAudioPath)) {
        try {
          fs.unlinkSync(tempAudioPath);
        } catch (e) {}
      }
    }
  }

  @Post('rewrite')
  async rewriteTiktok(@Request() req: any, @Body() body: { original_text: string; prompt?: string; voice_id?: string; voice_speed?: number }) {
    if (!body.original_text) {
      throw new HttpException('Thiếu văn bản gốc (original_text)', HttpStatus.BAD_REQUEST);
    }

    try {
      this.logger.log(`Rewriting from provided original text`);
      
      /** 1. Rewrite script */
      const rewrittenScript = await this.aiService.ztteam_rewriteTikTokScript(body.original_text, body.prompt);

      /** 2. Test TTS */
      const voiceId = body.voice_id || 'onyx';
      const voiceSpeed = body.voice_speed || 1.1;
      
      const { ztteam_getStorageRoot } = require('../common/ztteam_storage.util');
      const workDir = path.join(ztteam_getStorageRoot(), 'tmp');
      if (!fs.existsSync(workDir)) {
        fs.mkdirSync(workDir, { recursive: true });
      }
      
      const outputAudioPath = await this.ttsService.ztteam_textToSpeech(rewrittenScript.sub_voice, voiceId, workDir, voiceSpeed);
      
      /** Convert absolute path to relative public URL so frontend can play it */
      const relativeAudioUrl = '/storage/tmp/' + path.basename(outputAudioPath);

      return {
        success: true,
        data: {
          original_text: body.original_text,
          new_script: rewrittenScript,
          audio_url: relativeAudioUrl,
        }
      };
    } catch (error: any) {
      this.logger.error(`Error rewriting TikTok: ${error.message}`);
      throw new HttpException(error.message || 'Lỗi không xác định', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('render')
  @UseInterceptors(require('@nestjs/platform-express').FilesInterceptor('images', 20))
  async renderVideo(
    @Request() req: any, 
    @UploadedFiles() files: Array<any>, 
    @Body() body: { audio_url: string; hook: string; sub_voice: string }
  ) {
    if (!files || files.length === 0) {
      throw new HttpException('Vui lòng tải lên ít nhất 1 ảnh', HttpStatus.BAD_REQUEST);
    }
    if (!body.audio_url || !body.sub_voice) {
      throw new HttpException('Thiếu thông tin audio hoặc kịch bản', HttpStatus.BAD_REQUEST);
    }

    const { ztteam_getStorageRoot } = require('../common/ztteam_storage.util');
    const workDir = path.join(ztteam_getStorageRoot(), 'tmp');
    const renderId = crypto.randomUUID();
    const renderDir = path.join(workDir, renderId);
    
    try {
      fs.mkdirSync(renderDir, { recursive: true });
      this.logger.log(`Starting video render in ${renderDir}`);

      /** 1. Save uploaded images */
      const imagePaths: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const ext = path.extname(files[i].originalname) || '.jpg';
        const imgPath = path.join(renderDir, `raw_${i}${ext}`);
        fs.writeFileSync(imgPath, files[i].buffer);
        imagePaths.push(imgPath);
      }

      /** 2. Prepare images (resize to 1080x1280 with blur background) */
      const preparedImages: string[] = [];
      for (let i = 0; i < imagePaths.length; i++) {
        const prepPath = path.join(renderDir, `prep_${i}.jpg`);
        await this.ffmpegService.ztteam_prepareImage(imagePaths[i], prepPath, 1080, 1280);
        preparedImages.push(prepPath);
      }

      /** 3. Resolve audio path (from /storage/tmp/voice.mp3 to absolute path) */
      const audioFileName = path.basename(body.audio_url.split('?')[0]); // handle ?t=timestamp
      const audioPath = path.join(workDir, audioFileName);
      if (!fs.existsSync(audioPath)) {
        throw new Error('Không tìm thấy file audio trên server. Vui lòng tạo lại giọng đọc.');
      }

      const audioDuration = this.ttsService.ztteam_getAudioDuration(audioPath);

      /** 4. Generate Subtitles ASS */
      const subtitles = this.aiService.ztteam_generateSubtitles(body.sub_voice, audioDuration);
      /** Add Hook to subtitles at start (0 to 3 seconds) at top of screen */
      // Đã loại bỏ Hook khỏi Karaoke Subtitles theo yêu cầu của user
      
      const assContent = this.aiService.ztteam_generateASSContent(subtitles, 0, 1080, undefined, 1100); // 1100 is y-pos for sub (on top of the image)
      const subtitlePath = path.join(renderDir, 'subtitles.ass');
      fs.writeFileSync(subtitlePath, assContent, 'utf-8');

      /** 5. Create Slideshow (1080x1280 for the top 2/3 of the screen) */
      const slideshowPath = path.join(renderDir, 'slideshow.mp4');
      await this.ffmpegService.ztteam_createSlideshow(preparedImages, audioDuration, slideshowPath, 1080, 1280);

      /** 6. Merge All (Slideshow + Voice + Subtitles) */
      const finalVideoPath = path.join(renderDir, 'final.mp4');
      
      /** Fixed background color #0368ff (blue) */
      const bgColor = '0x0368ff';
      const fontPath = path.relative(process.cwd(), path.join(process.cwd(), 'assets', 'Montserrat-Black.ttf')).replace(/\\/g, '/');

      // 6. Generate Title (Hook) image with text using FFmpeg drawtext on a gradient background
      let drawtextArg = '';
      if (body.hook && body.hook.length > 0) {
        const words = body.hook.split(' ');
        const lines = [];
        let currentLine = '';
        for (const word of words) {
          if ((currentLine + ' ' + word).length > 25) {
             lines.push(currentLine.trim().toUpperCase());
             currentLine = word;
          } else {
             currentLine += ' ' + word;
          }
        }
        if (currentLine) lines.push(currentLine.trim().toUpperCase());
        
        const textFilters = [];
        const fontSize = 50;
        const lineSpacing = 10;
        const lineHeight = fontSize + lineSpacing;
        const totalHeight = lines.length * lineHeight;
        
        const startY = 1350;
        
        for (let i = 0; i < lines.length; i++) {
           const yPos = Math.round(startY + i * lineHeight);
           const safeText = lines[i].replace(/'/g, "\u2019").replace(/:/g, '\\:');
           /** First line white, remaining lines yellow (like the reference TikTok video) */
           const color = i === 0 ? 'white' : 'yellow';
           textFilters.push(`drawtext=fontfile='${fontPath}':text='${safeText}':fontcolor=${color}:fontsize=50:x=40:y=${yPos}`);
        }
        
        drawtextArg = `,${textFilters.join(',')}`;
      }
      
      /** 
       * Step A: Generate bg.png - SVG background with dark-to-bright blue gradient and Neon Lock Icon
       * Rendered directly via sharp for maximum performance (<0.1s)
       */
      const bgPath = path.join(renderDir, 'bg.png');
      const svgBg = `<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#021b42"/>
      <stop offset="60%" stop-color="#024bc0"/>
      <stop offset="100%" stop-color="#0368ff"/>
    </linearGradient>
    <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="16" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="1080" height="1920" fill="url(#bgGrad)"/>
  <!-- Perfectly Centered Neon Glow & Lock Icon (Violet/Magenta Glow) -->
  <g transform="translate(800, 1600)" filter="url(#neonGlow)">
    <circle cx="0" cy="0" r="240" fill="#a855f7" opacity="0.3"/>
    <g transform="translate(-140, -160)">
      <path d="M 75 100 A 65 65 0 0 1 205 100 V 150 H 175 V 100 A 35 35 0 0 0 105 100 V 150 H 75 Z" fill="#c084fc" />
      <rect x="30" y="140" width="220" height="230" rx="45" ry="45" fill="none" stroke="#c084fc" stroke-width="16" />
      <circle cx="140" cy="235" r="22" fill="#c084fc"/>
      <polygon points="128,245 152,245 156,290 124,290" fill="#c084fc"/>
    </g>
  </g>
</svg>`;
      const sharp = require('sharp');
      await sharp(Buffer.from(svgBg)).toFile(bgPath);

      /** 
       * Step B: Generate overlay.png - Transparent canvas containing ONLY the Title Text
       * The slideshow bottom alpha dissolve is handled directly in FFmpeg filterComplex,
       * so overlay.png doesn't draw any solid color background, eliminating all horizontal seams 100%!
       */
      const overlayPath = path.join(renderDir, 'overlay.png');
      require('child_process').execSync(`ffmpeg -y -f lavfi -i "color=c=black@0.0:s=1080x1920,format=rgba" -vf "format=rgba${drawtextArg}" -frames:v 1 "${overlayPath}"`);

      /**
       * Merge layers:
       * Layer 0 (bottom): bg.png - colored gradient
       * Layer 1 (middle): slideshow.mp4 at Y=0
       * Layer 2 (top):    overlay.png - transparent fade + title text
       * Layer 3:          voice audio
       */
      await this.ffmpegService.ztteam_mergeAll({
        slideshowPath,
        voicePath: audioPath,
        overlayPath: overlayPath,
        subtitlePath: subtitlePath,
        outputPath: path.join(renderDir, 'final.mp4'),
        duration: audioDuration,
        videoX: 0,
        videoY: 0,
        bgImagePath: bgPath,
      });

      return {
        success: true,
        data: {
          video_url: `/storage/tmp/${renderId}/final.mp4`
        }
      };
    } catch (error: any) {
      this.logger.error(`Error rendering video: ${error.message}`);
      throw new HttpException(error.message || 'Lỗi không xác định khi render', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
