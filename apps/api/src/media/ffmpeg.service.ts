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
     * Keep original image ratio (fit) and fill the rest with a blurred version of the same image
     */
    const cmd = `ffmpeg -y -i "${imagePath}" -vf "split[original][copy];[copy]scale=${vw}:${vh}:force_original_aspect_ratio=increase,crop=${vw}:${vh},boxblur=20:20[bg];[original]scale=${vw}:${vh}:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2" -frames:v 1 "${outputPath}"`;

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

    const fps = 30;
    
    // For xfade, we need overlaps. 
    // Let's define a crossfade duration (e.g. 1 second).
    const transitionDuration = 1;
    const baseImageDur = 5; // Each image shows for roughly 5 seconds max
    
    // Calculate how many segments we need to fill totalDuration
    let numImages = images.length;
    let actualN = Math.max(numImages, Math.ceil((totalDuration - transitionDuration) / (baseImageDur - transitionDuration)));
    if (actualN < 1) actualN = 1;
    
    const imageDur = actualN > 1 
      ? (totalDuration + (actualN - 1) * transitionDuration) / actualN
      : totalDuration;

    let inputs = '';
    let filterComplex = '';

    for (let i = 0; i < actualN; i++) {
      const imgPath = images[i % images.length];
      inputs += `-loop 1 -t ${imageDur} -i "${imgPath}" `;
      // Just ensure it's in yuv420p format (no zoompan to avoid jitter)
      filterComplex += `[${i}:v]format=yuv420p[v${i}];`;
    }

    if (actualN === 1) {
      filterComplex += `[v0]copy[vout]`;
    } else {
      let lastOut = `v0`;
      const xfadeTransitions = [
        'fade', 'wipeleft', 'wiperight', 'wipeup', 'wipedown',
        'slideleft', 'slideright', 'slideup', 'slidedown',
        'smoothleft', 'smoothright', 'smoothup', 'smoothdown',
        'rectcrop', 'circlecrop', 'circleclose', 'circleopen',
        'horzclose', 'horzopen', 'vertclose', 'vertopen',
        'diagbl', 'diagbr', 'diagtl', 'diagtr',
        'hlslice', 'hrslice', 'vuslice', 'vdslice',
        'distance', 'radial'
      ];
      
      for (let i = 1; i < actualN; i++) {
        const offset = (imageDur - transitionDuration) * i;
        const isLast = i === actualN - 1;
        const outName = isLast ? 'vout' : `v_fade_${i}`;
        const randomTransition = xfadeTransitions[Math.floor(Math.random() * xfadeTransitions.length)];
        filterComplex += `[${lastOut}][v${i}]xfade=transition=${randomTransition}:duration=${transitionDuration}:offset=${offset}[${outName}]${isLast ? '' : ';'}`;
        lastOut = outName;
      }
    }

    filterComplex = filterComplex.replace(/;+$/, '');

    const cmd = `ffmpeg -y ${inputs} -filter_complex "${filterComplex}" -map "[vout]" -c:v libx264 -preset fast -t ${totalDuration} "${outputPath}"`;

    try {
      execSync(cmd, { stdio: 'pipe', timeout: 120000 });
      this.logger.log(`Slideshow created: ${outputPath}`);
    } catch (error: any) {
      this.logger.error(`Slideshow creation failed: ${error.message}`);
      throw new Error(`Lỗi tạo slideshow đa hiệu ứng: ${error.message}`);
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
      filterComplex = `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[bg];[1:v]format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lt(Y,800),255,if(gt(Y,1280),0,255*pow((1280-Y)/480,2)))'[slide_faded];[bg][slide_faded]overlay=x=${videoX}:y=${videoY}[base];[base][2:v]overlay=0:0[withoverlay];[withoverlay]ass='${subtitlePath.replace(/\\/g, '/').replace(/:/g, '\\:')}':fontsdir=assets[vout]`;
    } else {
      // Dynamic blurred background from the slideshow itself
      // We add a dummy color input (0:v) to keep the input indices (3:a for voice) consistent with the bgImagePath branch
      inputs = `-f lavfi -i color=c=black:s=10x10 -stream_loop -1 -i "${slideshowPath}" -i "${overlayPath}" -i "${voicePath}"`;
      filterComplex = `[1:v]scale=216:384:force_original_aspect_ratio=increase,crop=216:384,boxblur=10:10,scale=1080:1920[bg];[bg][1:v]overlay=x=${videoX}:y=${videoY}[base];[base][2:v]overlay=0:0[withoverlay];[withoverlay]ass='${subtitlePath.replace(/\\/g, '/').replace(/:/g, '\\:')}':fontsdir=assets[vout]`;
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
