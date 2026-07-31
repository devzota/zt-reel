import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

import { PrismaService } from '../prisma/prisma.service';

/**
 * ZTTeamAIService — Provider adapter for AI text generation.
 * Currently supports OpenAI GPT. Expandable to Claude/Gemini via env config.
 */
@Injectable()
export class ZTTeamAIService {
  private readonly logger = new Logger('ZTTeamAIService');

  constructor(private readonly prisma: PrismaService) {}

  private async getOpenAIClient(): Promise<OpenAI | null> {
    if (process.env.DEEPSEEK_API_KEY) {
      return new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: 'https://api.deepseek.com',
      });
    }

    const dbKey = await this.prisma.ztteam_settings.findUnique({
      where: { key: 'openai_api_key' }
    });
    
    const key = dbKey?.value || process.env.OPENAI_API_KEY;
    if (key) {
      return new OpenAI({ apiKey: key });
    }

    return null;
  }

  /**
   * Generate a short reel script (~15 seconds) from a WordPress post.
   * @param postContent - The article text content
   * @param tone - Writing tone (professional, humorous, dramatic, etc.)
   * @param maxWords - Target word count for the script
   * @returns The generated script text
   */
  async ztteam_generateScript(
    postContent: string,
    tone: string = 'professional',
    maxWords: number = 60,
    customPrompt?: string | null,
  ): Promise<{ caption: string; hook: string; sub_voice: string }> {
    this.logger.log(`Generating reel script (tone: ${tone}, maxWords: ${maxWords})`);

    const openai = await this.getOpenAIClient();
    if (!openai) {
      this.logger.warn('No API key found, returning mock script');
      const mockScript = await this.ztteam_getMockScript(postContent);
      return { caption: 'Mock Caption', hook: 'Mock Hook', sub_voice: mockScript };
    }

    const defaultSystemPrompt = `Bạn là chuyên gia viết kịch bản video ngắn (Reel) cho mạng xã hội.
Viết kịch bản giọng đọc cho video ~15 giây dựa trên bài viết người dùng cung cấp.

QUY TẮC TUYỆT ĐỐI CẦN TUÂN THỦ:
- CHỈ VIẾT ĐÚNG ${maxWords} TỪ HOẶC ÍT HƠN. KHÔNG ĐƯỢC VƯỢT QUÁ SỐ TỪ NÀY.
- Giọng văn: ${tone}
- Phải có hook mạnh ở câu đầu (gây tò mò)
- Kết thúc bằng CTA ngắn gọn
- KHÔNG dùng emoji, hashtag, hay ký tự đặc biệt trong kịch bản giọng đọc`;

    const systemPrompt = customPrompt ? customPrompt : defaultSystemPrompt;

    try {
      const response = await openai.chat.completions.create({
        model: process.env.DEEPSEEK_API_KEY ? 'deepseek-chat' : 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `${systemPrompt}

IMPORTANT: YOU MUST ALWAYS RETURN THE RESULT IN ENGLISH.
YOU MUST RETURN EXACTLY ONE JSON OBJECT WITH THE FOLLOWING STRUCTURE:
{
  "caption": "A catchy social media caption (with hashtags if appropriate)",
  "hook": "A short, engaging text hook (title) to display on the video",
  "sub_voice": "The spoken script for the voiceover"
}`,
          },
          {
            role: 'user',
            content: `Generate Reel content from the following article:\n\n${postContent.substring(0, 2000)}`,
          },
        ],
        max_tokens: Math.max(150, Math.round(maxWords * 2.5)),
        temperature: 0.8,
      });

      const resultString = response.choices[0]?.message?.content?.trim() || '{}';
      const result = JSON.parse(resultString);
      
      this.logger.log(`Script generated: Hook="${result.hook}"`);
      return {
        caption: result.caption || '',
        hook: result.hook || '',
        sub_voice: result.sub_voice || ''
      };
    } catch (error: any) {
      this.logger.error(`AI script generation failed: ${error.message}`);
      throw new Error('Lỗi tạo kịch bản AI: ' + error.message);
    }
  }

  /**
   * Generate subtitle timing data from a script.
   * Splits the script into sentences and assigns timestamps evenly across the audio duration.
   * @param script - The script text
   * @param audioDuration - Total audio duration in seconds
   * @returns Array of subtitle entries with start, end, and text
   */
  ztteam_generateSubtitles(
    script: string,
    audioDuration: number,
  ): Array<{ start: number; end: number; text: string }> {
    /** Split script into sentences by punctuation */
    const sentences = script
      .split(/(?<=[.!?。])\s+/)
      .filter(s => s.trim().length > 0);

    if (sentences.length === 0) return [];

    const segmentDuration = audioDuration / sentences.length;
    return sentences.map((text, i) => ({
      start: Math.round(i * segmentDuration * 100) / 100,
      end: Math.round((i + 1) * segmentDuration * 100) / 100,
      text: text.trim(),
    }));
  }

  /**
   * Generate an ASS subtitle file content from subtitle data.
   * ASS format is used because FFmpeg renders it beautifully with custom fonts/colors.
   */
  ztteam_generateASSContent(
    subtitles: Array<{ start: number; end: number; text: string }>,
    videoY: number = 0,
    videoHeight: number = 1920,
    hookText?: string,
    subtitlesY?: number
  ): string {
    const formatTime = (seconds: number): string => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      const cs = Math.round((seconds % 1) * 100);
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
    };

    /** Position subtitle based on subtitlesY or inside the video frame */
    const bottomOfVideo = videoY + videoHeight;
    /** For Alignment=8 (Top Center), MarginV is from the top! */
    const marginV = subtitlesY !== undefined ? subtitlesY : (bottomOfVideo + 40);
    const topMarginV = Math.max(120, videoY + 120);

    let ass = `[Script Info]
Title: ZTReel Subtitles
ScriptType: v4.00+
WrapStyle: 1
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,60,&H0000FFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,4,2,8,40,40,${marginV},1
Style: Hook,Arial,70,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,5,3,8,40,40,${topMarginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    if (hookText && subtitles.length > 0) {
      /** Show hook text for the first 5 seconds or until video ends */
      const hookEnd = formatTime(Math.min(5, subtitles[subtitles.length - 1].end));
      ass += `Dialogue: 1,0:00:00.00,${hookEnd},Hook,,0,0,0,,{\\b1\\c&H00FFFF&\\3c&H000000&}${hookText}\n`;
    }

    for (const sub of subtitles) {
      const durationSec = sub.end - sub.start;
      const words = sub.text.split(' ').filter(w => w.trim().length > 0);
      if (words.length === 0) continue;
      
      /** Fake karaoke effect: split duration equally among words */
      const wordDurationCs = Math.round((durationSec * 100) / words.length);
      const karaokeText = words.map(w => `{\\k${wordDurationCs}}${w}`).join(' ');

      ass += `Dialogue: 0,${formatTime(sub.start)},${formatTime(sub.end)},Default,,0,0,0,,${karaokeText}\n`;
    }

    return ass;
  }

  /** Mock script for development without API key */
  private ztteam_getMockScript(postContent: string): string {
    const firstSentence = postContent.split(/[.!?]/)[0]?.trim() || 'Tin tức nóng hổi';
    return `Bạn có biết? ${firstSentence}. Đây là thông tin bạn không nên bỏ lỡ. Theo dõi ngay để cập nhật thêm!`;
  }
}
