import sharp from 'sharp';
import path from 'path';

export interface ImageProcessingOptions {
  resize?: {
    width?: number;
    height?: number;
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  };
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  thumbnail?: boolean;
}

export interface ProcessedImage {
  buffer: Buffer;
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
}

export class MediaProcessor {
  /**
   * Process image with specified options
   */
  static async processImage(
    inputBuffer: Buffer,
    options: ImageProcessingOptions = {}
  ): Promise<ProcessedImage> {
    let processor = sharp(inputBuffer);

    // Apply resize if specified
    if (options.resize) {
      processor = processor.resize({
        width: options.resize.width,
        height: options.resize.height,
        fit: options.resize.fit || 'cover',
        withoutEnlargement: true
      });
    }

    // Apply format conversion
    if (options.format) {
      switch (options.format) {
        case 'jpeg':
          processor = processor.jpeg({ quality: options.quality || 85 });
          break;
        case 'png':
          processor = processor.png({ quality: options.quality || 85 });
          break;
        case 'webp':
          processor = processor.webp({ quality: options.quality || 85 });
          break;
      }
    }

    // Generate thumbnail if requested
    if (options.thumbnail) {
      processor = processor.resize(300, 300, { fit: 'cover' });
    }

    const buffer = await processor.toBuffer();
    const metadata = await sharp(buffer).metadata();

    return {
      buffer,
      metadata: {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: buffer.length
      }
    };
  }

  /**
   * Generate multiple image variants (original, thumbnail, web-optimized)
   */
  static async generateImageVariants(
    inputBuffer: Buffer,
    originalFilename: string
  ): Promise<{
    original: ProcessedImage;
    thumbnail: ProcessedImage;
    webOptimized: ProcessedImage;
  }> {
    const [original, thumbnail, webOptimized] = await Promise.all([
      // Original (lightly optimized)
      this.processImage(inputBuffer, {
        quality: 90,
        format: this.getOptimalFormat(originalFilename)
      }),
      
      // Thumbnail
      this.processImage(inputBuffer, {
        resize: { width: 300, height: 300, fit: 'cover' },
        quality: 80,
        format: 'jpeg'
      }),
      
      // Web-optimized
      this.processImage(inputBuffer, {
        resize: { width: 1200, height: 1200, fit: 'inside' },
        quality: 75,
        format: 'webp'
      })
    ]);

    return { original, thumbnail, webOptimized };
  }

  /**
   * Extract metadata from image
   */
  static async extractImageMetadata(buffer: Buffer): Promise<{
    width: number;
    height: number;
    format: string;
    size: number;
    hasAlpha: boolean;
    colorSpace: string;
    density?: number;
  }> {
    const metadata = await sharp(buffer).metadata();
    
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
      size: buffer.length,
      hasAlpha: metadata.hasAlpha || false,
      colorSpace: metadata.space || 'unknown',
      density: metadata.density
    };
  }

  /**
   * Validate image file
   */
  static async validateImage(buffer: Buffer, maxSize: number = 10 * 1024 * 1024): Promise<void> {
    // Check file size
    if (buffer.length > maxSize) {
      throw new Error(`Image size ${buffer.length} exceeds maximum allowed size of ${maxSize} bytes`);
    }

    try {
      const metadata = await sharp(buffer).metadata();
      
      // Check if it's a valid image
      if (!metadata.width || !metadata.height) {
        throw new Error('Invalid image file');
      }

      // Check image dimensions
      const maxDimension = 8000;
      if (metadata.width > maxDimension || metadata.height > maxDimension) {
        throw new Error(`Image dimensions (${metadata.width}x${metadata.height}) exceed maximum allowed size of ${maxDimension}x${maxDimension}`);
      }

    } catch (error) {
      if (error instanceof Error && error.message.includes('Input file contains unsupported image format')) {
        throw new Error('Unsupported image format');
      }
      throw error;
    }
  }

  /**
   * Get optimal format for web delivery
   */
  private static getOptimalFormat(filename: string): 'jpeg' | 'png' | 'webp' {
    const ext = path.extname(filename).toLowerCase();
    
    switch (ext) {
      case '.png':
        return 'png';
      case '.webp':
        return 'webp';
      default:
        return 'jpeg';
    }
  }

  /**
   * Generate video thumbnail (placeholder for future implementation)
   */
  static async generateVideoThumbnail(videoBuffer: Buffer): Promise<Buffer> {
    // TODO: Implement video thumbnail generation using ffmpeg
    throw new Error('Video thumbnail generation not yet implemented');
  }

  /**
   * Extract video metadata (placeholder for future implementation)
   */
  static async extractVideoMetadata(videoBuffer: Buffer): Promise<{
    duration: number;
    width: number;
    height: number;
    format: string;
    size: number;
  }> {
    // TODO: Implement video metadata extraction using ffmpeg
    throw new Error('Video metadata extraction not yet implemented');
  }

  /**
   * Validate video file (placeholder for future implementation)
   */
  static async validateVideo(buffer: Buffer, maxSize: number = 100 * 1024 * 1024): Promise<void> {
    // Check file size
    if (buffer.length > maxSize) {
      throw new Error(`Video size ${buffer.length} exceeds maximum allowed size of ${maxSize} bytes`);
    }

    // TODO: Implement video validation
  }

  /**
   * Get file category based on MIME type
   */
  static getFileCategory(mimeType: string): 'photo' | 'video' | 'document' {
    if (mimeType.startsWith('image/')) {
      return 'photo';
    } else if (mimeType.startsWith('video/')) {
      return 'video';
    } else {
      return 'document';
    }
  }

  /**
   * Get allowed MIME types for category
   */
  static getAllowedMimeTypes(category: 'photo' | 'video' | 'document'): string[] {
    switch (category) {
      case 'photo':
        return [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/bmp',
          'image/tiff'
        ];
      
      case 'video':
        return [
          'video/mp4',
          'video/mpeg',
          'video/quicktime',
          'video/avi',
          'video/webm',
          'video/ogg'
        ];
      
      case 'document':
        return [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
          'text/csv'
        ];
      
      default:
        return [];
    }
  }

  /**
   * Get maximum file size for category
   */
  static getMaxFileSize(category: 'photo' | 'video' | 'document'): number {
    switch (category) {
      case 'photo':
        return 10 * 1024 * 1024; // 10MB
      case 'video':
        return 100 * 1024 * 1024; // 100MB
      case 'document':
        return 25 * 1024 * 1024; // 25MB
      default:
        return 10 * 1024 * 1024; // 10MB
    }
  }
}