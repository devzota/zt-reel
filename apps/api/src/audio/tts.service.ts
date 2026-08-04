import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { PrismaService } from '../prisma/prisma.service';

/**
 * ZTTeamTTSService — Text-to-Speech using OpenAI TTS-1.
 * Generates audio files and measures their duration via ffprobe.
 */
@Injectable()
export class ZTTeamTTSService {
  private readonly logger = new Logger('ZTTeamTTSService');

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Convert text to speech using OpenAI TTS-1 and save to file.
   * @param text - The script to read
   * @param voiceId - OpenAI voice ID (alloy, echo, fable, onyx, nova, shimmer)
   * @param outputDir - Directory to save the MP3 file
   * @returns Absolute path to the generated MP3 file
   */
  async ztteam_textToSpeech(
    text: string,
    voiceId: string = 'alloy',
    workDir: string,
    voiceSpeed: number = 1.0,
  ): Promise<string> {
    const outputPath = path.join(workDir, 'voice.mp3');
    this.logger.log(`TTS: voice=${voiceId}, speed=${voiceSpeed}, workDir=${workDir}`);

    const settingsDb = await this.prisma.ztteam_settings.findUnique({
      where: { key: 'OPENAI_API_KEY' },
    });
    const apiKey = settingsDb?.value || process.env.OPENAI_API_KEY || '';

    if (!apiKey) {
      this.logger.warn('No OPENAI_API_KEY found in DB or env, generating silent audio as fallback');
      return this.ztteam_generateSilentAudio(outputPath, 12);
    }

    try {
      const openai = new OpenAI({ apiKey });
      const mp3 = await openai.audio.speech.create({
        model: 'tts-1',
        voice: voiceId as any,
        input: text,
        speed: voiceSpeed,
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      fs.writeFileSync(outputPath, buffer);
      this.logger.log(`TTS audio saved: ${outputPath} (${buffer.length} bytes)`);
      return outputPath;
    } catch (error: any) {
      this.logger.error(`TTS failed: ${error.message}`);
      throw new Error('Lỗi tạo giọng đọc: ' + error.message);
    }
  }

  /**
   * Get audio duration in seconds using ffprobe.
   * @param filePath - Path to the audio file
   * @returns Duration in seconds
   */
  ztteam_getAudioDuration(filePath: string): number {
    try {
      const result = execSync(
        `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`,
        { encoding: 'utf-8' },
      );
      const duration = parseFloat(result.trim());
      this.logger.log(`Audio duration: ${duration}s for ${filePath}`);
      return duration;
    } catch (error: any) {
      this.logger.error(`ffprobe failed: ${error.message}`);
      /** Fallback: estimate ~12 seconds if ffprobe unavailable */
      return 12;
    }
  }

  /**
   * Generate a silent audio file as fallback when no API key is available.
   * Uses ffmpeg to create a silent MP3 of specified duration.
   */
  private ztteam_generateSilentAudio(outputPath: string, durationSec: number): string {
    try {
      execSync(
        `ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t ${durationSec} -q:a 9 "${outputPath}"`,
        { stdio: 'pipe' },
      );
    } catch {
      /** If ffmpeg fails, create a tiny placeholder file */
      fs.writeFileSync(outputPath, Buffer.alloc(1024));
    }
    return outputPath;
  }
}
