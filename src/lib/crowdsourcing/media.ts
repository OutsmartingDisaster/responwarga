import sharp from 'sharp';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';

interface ProcessedMedia {
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
}

/**
 * Process and compress uploaded image
 */
export async function processImage(
  buffer: Buffer,
  projectId: string,
  fileName: string,
  maxWidth = 1920
): Promise<ProcessedMedia> {
  const uploadDir = path.join(process.cwd(), 'public/uploads/crowdsource', projectId);
  await mkdir(uploadDir, { recursive: true });

  // Get image metadata
  const metadata = await sharp(buffer).metadata();
  
  // Resize if too large
  let processedBuffer = buffer;
  if (metadata.width && metadata.width > maxWidth) {
    processedBuffer = await sharp(buffer)
      .resize(maxWidth, null, { withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
  } else {
    // Just optimize
    processedBuffer = await sharp(buffer)
      .jpeg({ quality: 85 })
      .toBuffer();
  }

  // Save main image
  const ext = 'jpg';
  const baseName = fileName.replace(/\.[^/.]+$/, '');
  const mainFileName = `${baseName}.${ext}`;
  const mainPath = path.join(uploadDir, mainFileName);
  await writeFile(mainPath, processedBuffer);

  // Generate thumbnail
  const thumbBuffer = await sharp(buffer)
    .resize(300, 300, { fit: 'cover' })
    .jpeg({ quality: 70 })
    .toBuffer();
  
  const thumbFileName = `${baseName}_thumb.${ext}`;
  const thumbPath = path.join(uploadDir, thumbFileName);
  await writeFile(thumbPath, thumbBuffer);

  const newMetadata = await sharp(processedBuffer).metadata();

  return {
    url: `/uploads/crowdsource/${projectId}/${mainFileName}`,
    thumbnailUrl: `/uploads/crowdsource/${projectId}/${thumbFileName}`,
    width: newMetadata.width,
    height: newMetadata.height
  };
}

/**
 * Generate video thumbnail (placeholder - requires ffmpeg)
 */
export async function generateVideoThumbnail(
  videoPath: string,
  projectId: string,
  fileName: string
): Promise<string | null> {
  // Note: This requires ffmpeg to be installed
  // For now, return null - implement with ffmpeg later
  return null;
}

/**
 * Validate file type
 */
export function validateMediaType(
  mimeType: string,
  allowPhoto: boolean,
  allowVideo: boolean
): { valid: boolean; type: 'photo' | 'video' | null; error?: string } {
  const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const videoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];

  if (imageTypes.includes(mimeType)) {
    if (!allowPhoto) return { valid: false, type: null, error: 'Foto tidak diizinkan' };
    return { valid: true, type: 'photo' };
  }

  if (videoTypes.includes(mimeType)) {
    if (!allowVideo) return { valid: false, type: null, error: 'Video tidak diizinkan' };
    return { valid: true, type: 'video' };
  }

  return { valid: false, type: null, error: 'Tipe file tidak didukung' };
}

/**
 * Strip EXIF data for privacy
 */
export async function stripExif(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate() // Auto-rotate based on EXIF, then strip
    .toBuffer();
}
