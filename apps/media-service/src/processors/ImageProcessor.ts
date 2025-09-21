import sharp from 'sharp';
import { CustomError } from '../../../shared/errors/CustomError';

export interface ImageInfo {
  width: number;
  height: number;
  format: string;
  size: number;
  hasAlpha: boolean;
  colorSpace: string;
  density?: number;
  metadata: Record<string, any>;
}

export interface ResizeOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  position?: 'top' | 'right top' | 'right' | 'right bottom' | 'bottom' | 'left bottom' | 'left' | 'left top' | 'center';
  background?: string;
  withoutEnlargement?: boolean;
  kernel?: 'lanczos3' | 'lanczos2' | 'nearest' | 'cubic' | 'mitchell';
}

export interface ConversionOptions {
  quality?: number;
  progressive?: boolean;
  mozjpeg?: boolean;
  lossless?: boolean;
  effort?: number;
}

export interface FaceDetectionResult {
  faces: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  }>;
  suggestedCrop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ContentModerationResult {
  isAppropriate: boolean;
  confidence: number;
  categories: Array<{
    name: string;
    confidence: number;
  }>;
  suggestions: string[];
}

export class ImageProcessor {
  private readonly SUPPORTED_FORMATS = ['jpeg', 'png', 'gif', 'webp', 'avif', 'tiff', 'bmp'];
  private readonly MAX_DIMENSIONS = { width: 4096, height: 4096 };
  private readonly MIN_DIMENSIONS = { width: 1, height: 1 };
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  /**
   * Get comprehensive image information
   */
  public async getImageInfo(file: File): Promise<ImageInfo> {
    try {
      const buffer = await file.arrayBuffer();
      const image = sharp(Buffer.from(buffer));
      const metadata = await image.metadata();

      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: file.size,
        hasAlpha: metadata.hasAlpha || false,
        colorSpace: metadata.space || 'srgb',
        density: metadata.density,
        metadata: {
          exif: metadata.exif,
          icc: metadata.icc,
          iptc: metadata.iptc,
          xmp: metadata.xmp
        }
      };
    } catch (error) {
      throw new CustomError(`Failed to get image info: ${error instanceof Error ? error.message : 'Unknown error'}`, 400);
    }
  }

  /**
   * Resize image with advanced options
   */
  public async resizeImage(
    file: File,
    width: number,
    height: number,
    options: ResizeOptions = {}
  ): Promise<Buffer> {
    try {
      const buffer = await file.arrayBuffer();
      let image = sharp(Buffer.from(buffer));

      // Validate dimensions
      this.validateDimensions(width, height);

      // Apply resize
      image = image.resize(width, height, {
        fit: options.fit || 'cover',
        position: options.position || 'center',
        background: options.background || { r: 255, g: 255, b: 255, alpha: 1 },
        withoutEnlargement: options.withoutEnlargement || false,
        kernel: options.kernel || 'lanczos3'
      });

      // Apply format conversion and quality
      const format = options.format || 'webp';
      const quality = options.quality || 80;

      switch (format) {
        case 'jpeg':
          image = image.jpeg({ quality, progressive: true, mozjpeg: true });
          break;
        case 'png':
          image = image.png({ quality, progressive: true });
          break;
        case 'webp':
          image = image.webp({ quality, effort: 6 });
          break;
        case 'avif':
          image = image.avif({ quality, effort: 4 });
          break;
        default:
          throw new CustomError(`Unsupported format: ${format}`, 400);
      }

      return await image.toBuffer();
    } catch (error) {
      throw new CustomError(`Failed to resize image: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  /**
   * Convert image to WebP format
   */
  public async convertToWebP(file: File, options: ConversionOptions = {}): Promise<Buffer> {
    try {
      const buffer = await file.arrayBuffer();
      let image = sharp(Buffer.from(buffer));

      const quality = options.quality || 80;
      const effort = options.effort || 6;

      image = image.webp({
        quality,
        effort,
        lossless: options.lossless || false
      });

      return await image.toBuffer();
    } catch (error) {
      throw new CustomError(`Failed to convert to WebP: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  /**
   * Convert image to AVIF format
   */
  public async convertToAVIF(file: File, options: ConversionOptions = {}): Promise<Buffer> {
    try {
      const buffer = await file.arrayBuffer();
      let image = sharp(Buffer.from(buffer));

      const quality = options.quality || 80;
      const effort = options.effort || 4;

      image = image.avif({
        quality,
        effort,
        lossless: options.lossless || false
      });

      return await image.toBuffer();
    } catch (error) {
      throw new CustomError(`Failed to convert to AVIF: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  /**
   * Optimize image for web delivery
   */
  public async optimizeForWeb(
    file: File,
    options: {
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
      format?: 'webp' | 'avif' | 'jpeg';
      stripMetadata?: boolean;
    } = {}
  ): Promise<Buffer> {
    try {
      const buffer = await file.arrayBuffer();
      let image = sharp(Buffer.from(buffer));

      const {
        maxWidth = 1920,
        maxHeight = 1080,
        quality = 85,
        format = 'webp',
        stripMetadata = true
      } = options;

      // Get original dimensions
      const metadata = await image.metadata();
      const originalWidth = metadata.width || 0;
      const originalHeight = metadata.height || 0;

      // Calculate new dimensions maintaining aspect ratio
      let newWidth = originalWidth;
      let newHeight = originalHeight;

      if (originalWidth > maxWidth || originalHeight > maxHeight) {
        const aspectRatio = originalWidth / originalHeight;
        
        if (originalWidth > originalHeight) {
          newWidth = maxWidth;
          newHeight = Math.round(maxWidth / aspectRatio);
        } else {
          newHeight = maxHeight;
          newWidth = Math.round(maxHeight * aspectRatio);
        }
      }

      // Resize if needed
      if (newWidth !== originalWidth || newHeight !== originalHeight) {
        image = image.resize(newWidth, newHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // Strip metadata if requested
      if (stripMetadata) {
        image = image.withMetadata(false);
      }

      // Apply format conversion
      switch (format) {
        case 'jpeg':
          image = image.jpeg({ quality, progressive: true, mozjpeg: true });
          break;
        case 'webp':
          image = image.webp({ quality, effort: 6 });
          break;
        case 'avif':
          image = image.avif({ quality, effort: 4 });
          break;
        default:
          throw new CustomError(`Unsupported format: ${format}`, 400);
      }

      return await image.toBuffer();
    } catch (error) {
      throw new CustomError(`Failed to optimize image: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  /**
   * Create thumbnail with smart cropping
   */
  public async createThumbnail(
    file: File,
    size: number,
    options: {
      quality?: number;
      format?: 'jpeg' | 'png' | 'webp';
      smartCrop?: boolean;
    } = {}
  ): Promise<Buffer> {
    try {
      const buffer = await file.arrayBuffer();
      let image = sharp(Buffer.from(buffer));

      const { quality = 90, format = 'webp', smartCrop = true } = options;

      // Use smart crop if requested and available
      if (smartCrop) {
        try {
          // Try to detect faces for smart cropping
          const faceResult = await this.detectFaces(file);
          if (faceResult.faces.length > 0 && faceResult.suggestedCrop) {
            const crop = faceResult.suggestedCrop;
            image = image.extract({
              left: crop.x,
              top: crop.y,
              width: crop.width,
              height: crop.height
            });
          }
        } catch (error) {
          // Fall back to center crop if face detection fails
        }
      }

      // Resize to thumbnail size
      image = image.resize(size, size, {
        fit: 'cover',
        position: 'center'
      });

      // Apply format
      switch (format) {
        case 'jpeg':
          image = image.jpeg({ quality, progressive: true });
          break;
        case 'png':
          image = image.png({ quality });
          break;
        case 'webp':
          image = image.webp({ quality, effort: 6 });
          break;
        default:
          throw new CustomError(`Unsupported format: ${format}`, 400);
      }

      return await image.toBuffer();
    } catch (error) {
      throw new CustomError(`Failed to create thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  /**
   * Strip metadata from image
   */
  public async stripMetadata(file: File): Promise<Buffer> {
    try {
      const buffer = await file.arrayBuffer();
      const image = sharp(Buffer.from(buffer));

      return await image.withMetadata(false).toBuffer();
    } catch (error) {
      throw new CustomError(`Failed to strip metadata: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  /**
   * Detect faces in image (placeholder implementation)
   */
  public async detectFaces(file: File): Promise<FaceDetectionResult> {
    try {
      // This is a placeholder implementation
      // In a real implementation, you would use a face detection library like:
      // - OpenCV.js
      // - face-api.js
      // - MediaPipe
      // - AWS Rekognition
      // - Google Vision API

      const buffer = await file.arrayBuffer();
      const image = sharp(Buffer.from(buffer));
      const metadata = await image.metadata();

      // Placeholder face detection logic
      const faces: FaceDetectionResult['faces'] = [];
      const suggestedCrop = {
        x: Math.floor(metadata.width! * 0.1),
        y: Math.floor(metadata.height! * 0.1),
        width: Math.floor(metadata.width! * 0.8),
        height: Math.floor(metadata.height! * 0.8)
      };

      return {
        faces,
        suggestedCrop
      };
    } catch (error) {
      throw new CustomError(`Failed to detect faces: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  /**
   * Moderate image content (placeholder implementation)
   */
  public async moderateContent(file: File): Promise<ContentModerationResult> {
    try {
      // This is a placeholder implementation
      // In a real implementation, you would use a content moderation service like:
      // - AWS Rekognition
      // - Google Vision API
      // - Azure Content Moderator
      // - Custom ML model

      const buffer = await file.arrayBuffer();
      const image = sharp(Buffer.from(buffer));

      // Placeholder content moderation logic
      const categories = [
        { name: 'safe', confidence: 0.95 },
        { name: 'appropriate', confidence: 0.90 }
      ];

      return {
        isAppropriate: true,
        confidence: 0.95,
        categories,
        suggestions: []
      };
    } catch (error) {
      throw new CustomError(`Failed to moderate content: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  /**
   * Generate multiple sizes of an image
   */
  public async generateMultipleSizes(
    file: File,
    sizes: Array<{ name: string; width: number; height: number; quality?: number }>,
    options: {
      format?: 'jpeg' | 'png' | 'webp' | 'avif';
      stripMetadata?: boolean;
    } = {}
  ): Promise<Record<string, Buffer>> {
    try {
      const results: Record<string, Buffer> = {};
      const { format = 'webp', stripMetadata = true } = options;

      for (const size of sizes) {
        const buffer = await this.resizeImage(file, size.width, size.height, {
          format,
          quality: size.quality || 80,
          fit: 'cover'
        });

        if (stripMetadata) {
          const strippedBuffer = await this.stripMetadataFromBuffer(buffer);
          results[size.name] = strippedBuffer;
        } else {
          results[size.name] = buffer;
        }
      }

      return results;
    } catch (error) {
      throw new CustomError(`Failed to generate multiple sizes: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  /**
   * Create a progressive JPEG
   */
  public async createProgressiveJPEG(file: File, quality: number = 85): Promise<Buffer> {
    try {
      const buffer = await file.arrayBuffer();
      const image = sharp(Buffer.from(buffer));

      return await image
        .jpeg({
          quality,
          progressive: true,
          mozjpeg: true
        })
        .toBuffer();
    } catch (error) {
      throw new CustomError(`Failed to create progressive JPEG: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  /**
   * Apply watermark to image
   */
  public async applyWatermark(
    file: File,
    watermarkFile: File,
    options: {
      position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
      opacity?: number;
      scale?: number;
    } = {}
  ): Promise<Buffer> {
    try {
      const { position = 'bottom-right', opacity = 0.5, scale = 0.1 } = options;

      const mainBuffer = await file.arrayBuffer();
      const watermarkBuffer = await watermarkFile.arrayBuffer();

      const mainImage = sharp(Buffer.from(mainBuffer));
      const watermarkImage = sharp(Buffer.from(watermarkBuffer));

      // Get dimensions
      const mainMetadata = await mainImage.metadata();
      const watermarkMetadata = await watermarkImage.metadata();

      const mainWidth = mainMetadata.width || 0;
      const mainHeight = mainMetadata.height || 0;
      const watermarkWidth = Math.floor((watermarkMetadata.width || 0) * scale);
      const watermarkHeight = Math.floor((watermarkMetadata.height || 0) * scale);

      // Calculate position
      let left = 0;
      let top = 0;

      switch (position) {
        case 'top-left':
          left = 10;
          top = 10;
          break;
        case 'top-right':
          left = mainWidth - watermarkWidth - 10;
          top = 10;
          break;
        case 'bottom-left':
          left = 10;
          top = mainHeight - watermarkHeight - 10;
          break;
        case 'bottom-right':
          left = mainWidth - watermarkWidth - 10;
          top = mainHeight - watermarkHeight - 10;
          break;
        case 'center':
          left = Math.floor((mainWidth - watermarkWidth) / 2);
          top = Math.floor((mainHeight - watermarkHeight) / 2);
          break;
      }

      // Resize watermark
      const resizedWatermark = await watermarkImage
        .resize(watermarkWidth, watermarkHeight)
        .png({ opacity })
        .toBuffer();

      // Composite watermark onto main image
      return await mainImage
        .composite([{
          input: resizedWatermark,
          left,
          top
        }])
        .toBuffer();
    } catch (error) {
      throw new CustomError(`Failed to apply watermark: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  /**
   * Validate image dimensions
   */
  private validateDimensions(width: number, height: number): void {
    if (width < this.MIN_DIMENSIONS.width || width > this.MAX_DIMENSIONS.width) {
      throw new CustomError(`Invalid width: ${width}. Must be between ${this.MIN_DIMENSIONS.width} and ${this.MAX_DIMENSIONS.width}`, 400);
    }

    if (height < this.MIN_DIMENSIONS.height || height > this.MAX_DIMENSIONS.height) {
      throw new CustomError(`Invalid height: ${height}. Must be between ${this.MIN_DIMENSIONS.height} and ${this.MAX_DIMENSIONS.height}`, 400);
    }
  }

  /**
   * Strip metadata from buffer
   */
  private async stripMetadataFromBuffer(buffer: Buffer): Promise<Buffer> {
    try {
      const image = sharp(buffer);
      return await image.withMetadata(false).toBuffer();
    } catch (error) {
      throw new CustomError(`Failed to strip metadata: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  /**
   * Check if format is supported
   */
  public isFormatSupported(format: string): boolean {
    return this.SUPPORTED_FORMATS.includes(format.toLowerCase());
  }

  /**
   * Get supported formats
   */
  public getSupportedFormats(): string[] {
    return [...this.SUPPORTED_FORMATS];
  }

  /**
   * Get optimal format for web delivery
   */
  public getOptimalFormat(userAgent?: string): 'webp' | 'avif' | 'jpeg' {
    if (!userAgent) return 'webp';

    // Check for AVIF support
    if (userAgent.includes('Chrome/') && userAgent.includes('Version/')) {
      const chromeVersion = parseInt(userAgent.match(/Chrome\/(\d+)/)?.[1] || '0');
      if (chromeVersion >= 85) return 'avif';
    }

    // Check for WebP support
    if (userAgent.includes('Chrome/') || userAgent.includes('Firefox/') || userAgent.includes('Safari/')) {
      return 'webp';
    }

    return 'jpeg';
  }

  /**
   * Calculate optimal quality based on file size and target
   */
  public calculateOptimalQuality(originalSize: number, targetSize: number): number {
    if (targetSize >= originalSize) return 95;

    const ratio = targetSize / originalSize;
    
    if (ratio >= 0.8) return 90;
    if (ratio >= 0.6) return 80;
    if (ratio >= 0.4) return 70;
    if (ratio >= 0.2) return 60;
    
    return 50;
  }

  /**
   * Get processing statistics
   */
  public async getProcessingStats(): Promise<{
    supportedFormats: string[];
    maxDimensions: { width: number; height: number };
    minDimensions: { width: number; height: number };
    maxFileSize: number;
    features: string[];
  }> {
    return {
      supportedFormats: this.SUPPORTED_FORMATS,
      maxDimensions: this.MAX_DIMENSIONS,
      minDimensions: this.MIN_DIMENSIONS,
      maxFileSize: this.MAX_FILE_SIZE,
      features: [
        'resize',
        'format_conversion',
        'quality_optimization',
        'metadata_stripping',
        'progressive_jpeg',
        'smart_cropping',
        'watermarking',
        'face_detection',
        'content_moderation'
      ]
    };
  }
}
