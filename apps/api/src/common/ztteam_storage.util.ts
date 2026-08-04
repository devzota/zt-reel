/**
 * ZTTeam Storage Path Utility
 */
import * as path from 'path';

export function ztteam_getStorageRoot(): string {
  return process.env.STORAGE_PATH || path.join(process.cwd(), 'storage');
}

export function ztteam_getReelsPath(...subpaths: string[]): string {
  return path.join(ztteam_getStorageRoot(), 'reels', ...subpaths);
}

export function ztteam_getImagesPath(...subpaths: string[]): string {
  return path.join(ztteam_getStorageRoot(), 'images', ...subpaths);
}

export function ztteam_getTemplatesPath(...subpaths: string[]): string {
  return path.join(ztteam_getStorageRoot(), 'templates', ...subpaths);
}
