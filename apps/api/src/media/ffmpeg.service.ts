import { Injectable, Logger } from '@nestjs/common';
import { execSync, exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * ZTTeamFFmpegService — Wrapper around FFmpeg CLI for video rendering.
 * Handles image preprocessing, slideshow creation, and final video composition.
 */
@Injectable()
export class ZTTeamFFmpegService {
  private readonly logger = new Logger('ZTTeamFFmpegService');

  /**
   * Prepare an image for 9:16 vertical video (1080x1920).
   * If the image is horizontal, it adds a blurred background to fill the vertical frame.
   * @param imagePath - Path to the source image
   * @param outputPath - Path to save the processed image
   */
  async ztteam_prepareImage(
    imagePath: string, 
    outputPath: string,
    vw: number = 1080,
    vh: number = 1920,
    vx: number = 0,
    vy: number = 0
  ): Promise<void> {
    this.logger.log(`Preparing image: ${imagePath} for frame ${vw}x${vh}`);

    /**
     * Scale the original image to fill the specified vw x vh frame without distortion (using crop)
     */
    const cmd = `ffmpeg -y -i "${imagePath}" -vf "scale=${vw}:${vh}:force_original_aspect_ratio=increase,crop=${vw}:${vh}" -frames:v 1 "${outputPath}"`;

    try {
      execSync(cmd, { stdio: 'pipe', timeout: 30000 });
      this.logger.log(`Image prepared: ${outputPath}`);
    } catch (error: any) {
      this.logger.error(`Image preparation failed: ${error.message}`);
      throw new Error(`Lỗi xử lý ảnh: ${error.message}`);
    }
  }

  /**
   * Create a slideshow video from prepared images with Ken Burns effect.
   * Each image is shown for (totalDuration / imageCount) seconds.
   * @param images - Array of image file paths (already 1080x1920)
   * @param totalDuration - Total video duration in seconds
   * @param outputPath - Path to save the slideshow video
   */
  async ztteam_createSlideshow(
    images: string[],
    totalDuration: number,
    outputPath: string,
    vw: number = 1080,
    vh: number = 1920
  ): Promise<void> {
    this.logger.log(`Creating slideshow: ${images.length} images, ${totalDuration}s`);

    if (images.length === 0) {
      throw new Error('Không có ảnh để tạo slideshow');
    }

    const perImage = totalDuration / images.length;

    /**
     * Create a concat file for FFmpeg.
     * Each image is displayed for perImage seconds.
     */
    const concatDir = path.dirname(outputPath);
    const concatFile = path.join(concatDir, 'concat.txt');
    const concatContent = images
      .map(img => `file '${img.replace(/\\/g, '/')}'\nduration ${perImage}`)
      .join('\n');
    /** Add last image again without duration (FFmpeg concat requirement) */
    const lastImage = images[images.length - 1].replace(/\\/g, '/');
    fs.writeFileSync(concatFile, concatContent + `\nfile '${lastImage}'\n`);

    /**
     * Ken Burns effect: gentle zoom from 100% to 110% over each image's duration.
     * zoompan filter: z starts at 1.0 and increases to 1.1, d = frames per image.
     */
    const fps = 30;
    const framesPerImage = Math.round(perImage * fps);

    const cmd = `ffmpeg -y -f concat -safe 0 -i "${concatFile}" -vf "zoompan=z='min(zoom+0.0015,1.1)':d=${framesPerImage}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${vw}x${vh}:fps=${fps}" -c:v libx264 -pix_fmt yuv420p -t ${totalDuration} "${outputPath}"`;

    try {
      execSync(cmd, { stdio: 'pipe', timeout: 120000 });
      this.logger.log(`Slideshow created: ${outputPath}`);
    } catch (error: any) {
      this.logger.error(`Slideshow creation failed: ${error.message}`);
      throw new Error(`Lỗi tạo slideshow: ${error.message}`);
    } finally {
      /** Clean up concat file */
      if (fs.existsSync(concatFile)) fs.unlinkSync(concatFile);
    }
  }

  /**
   * Final merge: combine slideshow + voice + background music + overlay + subtitles.
   * @param options - All input file paths and output path
   */
  async ztteam_mergeAll(options: {
    slideshowPath: string;
    voicePath: string;
    bgMusicPath?: string;
    overlayPath: string;
    subtitlePath: string;
    outputPath: string;
    duration: number;
    videoX: number;
    videoY: number;
    bgImagePath?: string;
  }): Promise<void> {
    this.logger.log('Final merge starting...');

    const { slideshowPath, voicePath, bgMusicPath, overlayPath, subtitlePath, outputPath, duration, videoX, videoY } = options;

    /**
     * FFmpeg complex filter chain:
     * 1. Input 0: slideshow video (vw x vh)
     * 2. Input 1: overlay PNG (1080x1920, transparent)
     * 3. Input 2: voice audio
     * 4. Input 3: background music (optional)
     *
     * Filters:
     * - Create a 1080x1920 black/transparent canvas
     * - Overlay the slideshow video onto the canvas at videoX, videoY
     * - Overlay the PNG on top of the canvas
     * - Mix voice audio with background music (music at -15dB)
     * - Burn ASS subtitles into the video
     */
    let inputs = '';
    let filterComplex = '';

    if (options.bgImagePath && fs.existsSync(options.bgImagePath)) {
      inputs = `-loop 1 -t ${duration} -i "${options.bgImagePath}" -i "${slideshowPath}" -i "${overlayPath}" -i "${voicePath}"`;
      filterComplex = `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[bg];[bg][1:v]overlay=x=${videoX}:y=${videoY}[base];[base][2:v]overlay=0:0[withoverlay];[withoverlay]ass='${subtitlePath.replace(/\\/g, '/').replace(/:/g, '\\:')}'[vout]`;
    } else {
      inputs = `-f lavfi -i color=c=black:s=1080x1920 -t ${duration} -i "${slideshowPath}" -i "${overlayPath}" -i "${voicePath}"`;
      filterComplex = `[0:v][1:v]overlay=x=${videoX}:y=${videoY}[base];[base][2:v]overlay=0:0[withoverlay];[withoverlay]ass='${subtitlePath.replace(/\\/g, '/').replace(/:/g, '\\:')}'[vout]`;
    }
    let audioMap = '';

    if (bgMusicPath && fs.existsSync(bgMusicPath)) {
      inputs += ` -i "${bgMusicPath}"`;
      filterComplex += `;[3:a]volume=1.0[voice];[4:a]volume=0.15,afade=t=out:st=${duration - 2}:d=2[music];[voice][music]amix=inputs=2:duration=first[aout]`;
      audioMap = '-map "[aout]"';
    } else {
      audioMap = '-map 3:a';
    }

    const cmd = `ffmpeg -y ${inputs} -filter_complex "${filterComplex}" -map "[vout]" ${audioMap} -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k -shortest -t ${duration} "${outputPath}"`;

    try {
      execSync(cmd, { stdio: 'pipe', timeout: 180000 });
      this.logger.log(`Final video rendered: ${outputPath}`);
    } catch (error: any) {
      this.logger.error(`Final merge failed: ${error.message}`);
      throw new Error(`Lỗi ghép video cuối: ${error.message}`);
    }
  }

  /**
   * Generate a thumbnail from a video at 1 second mark.
   */
  async ztteam_generateThumbnail(videoPath: string, outputPath: string): Promise<void> {
    const cmd = `ffmpeg -y -i "${videoPath}" -ss 1 -frames:v 1 -vf "scale=540:960" "${outputPath}"`;
    try {
      execSync(cmd, { stdio: 'pipe', timeout: 15000 });
    } catch (error: any) {
      this.logger.warn(`Thumbnail generation failed: ${error.message}`);
    }
  }
}
