import { CustomError } from '../../../shared/errors/CustomError';

export interface ImageOptimizationOptions {
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  width?: number;
  height?: number;
  maintainAspectRatio?: boolean;
  progressive?: boolean;
  stripMetadata?: boolean;
  optimizeForWeb?: boolean;
  generateThumbnails?: boolean;
  thumbnailSizes?: Array<{ width: number; height: number; suffix: string }>;
}

export interface OptimizationResult {
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  format: string;
  dimensions: { width: number; height: number };
  thumbnails?: Array<{
    size: { width: number; height: number };
    suffix: string;
    data: Uint8Array;
    fileSize: number;
  }>;
  metadata: {
    processingTime: number;
    algorithm: string;
    quality: number;
    progressive: boolean;
  };
}

export interface ImageAnalysis {
  format: string;
  dimensions: { width: number; height: number };
  colorSpace: string;
  hasAlpha: boolean;
  bitDepth: number;
  compression: string;
  fileSize: number;
  estimatedWebSize: number;
  recommendations: string[];
}

export class ImageOptimizer {
  private readonly DEFAULT_OPTIONS: Required<ImageOptimizationOptions> = {
    quality: 85,
    format: 'webp',
    width: 1920,
    height: 1080,
    maintainAspectRatio: true,
    progressive: true,
    stripMetadata: true,
    optimizeForWeb: true,
    generateThumbnails: true,
    thumbnailSizes: [
      { width: 150, height: 150, suffix: '_thumb' },
      { width: 300, height: 300, suffix: '_small' },
      { width: 600, height: 600, suffix: '_medium' },
      { width: 1200, height: 1200, suffix: '_large' }
    ]
  };

  private readonly FORMAT_PRIORITIES = {
    modern: ['avif', 'webp', 'jpeg', 'png'],
    compatibility: ['jpeg', 'png', 'webp'],
    quality: ['png', 'jpeg', 'webp', 'avif']
  };

  private readonly QUALITY_PRESETS = {
    low: 60,
    medium: 75,
    high: 85,
    maximum: 95
  };

  /**
   * Optimize an image with the given options
   */
  public async optimizeImage(
    imageData: Uint8Array,
    options: ImageOptimizationOptions = {}
  ): Promise<OptimizationResult> {
    const startTime = Date.now();
    const mergedOptions = { ...this.DEFAULT_OPTIONS, ...options };

    try {
      // Analyze the original image
      const analysis = await this.analyzeImage(imageData);
      
      // Determine optimal format if not specified
      const optimalFormat = options.format || this.selectOptimalFormat(analysis, mergedOptions);
      
      // Calculate optimal dimensions
      const optimalDimensions = this.calculateOptimalDimensions(
        analysis.dimensions,
        mergedOptions
      );

      // Optimize the main image
      const optimizedData = await this.performOptimization(
        imageData,
        {
          ...mergedOptions,
          format: optimalFormat,
          width: optimalDimensions.width,
          height: optimalDimensions.height
        }
      );

      // Generate thumbnails if requested
      let thumbnails: OptimizationResult['thumbnails'] = undefined;
      if (mergedOptions.generateThumbnails) {
        thumbnails = await this.generateThumbnails(
          imageData,
          mergedOptions.thumbnailSizes,
          mergedOptions
        );
      }

      const processingTime = Date.now() - startTime;
      const compressionRatio = ((analysis.fileSize - optimizedData.length) / analysis.fileSize) * 100;

      return {
        originalSize: analysis.fileSize,
        optimizedSize: optimizedData.length,
        compressionRatio,
        format: optimalFormat,
        dimensions: optimalDimensions,
        thumbnails,
        metadata: {
          processingTime,
          algorithm: 'sharp',
          quality: mergedOptions.quality,
          progressive: mergedOptions.progressive
        }
      };
    } catch (error) {
      throw new CustomError(
        'IMAGE_OPTIMIZATION_FAILED',
        `Failed to optimize image: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      );
    }
  }

  /**
   * Analyze an image to determine its properties
   */
  public async analyzeImage(imageData: Uint8Array): Promise<ImageAnalysis> {
    try {
      // This is a placeholder implementation
      // In a real implementation, you would use a library like:
      // - Sharp (Node.js)
      // - ImageMagick
      // - libvips
      // - Canvas API

      const format = this.detectImageFormat(imageData);
      const dimensions = this.extractImageDimensions(imageData, format);
      const fileSize = imageData.length;

      // Estimate web-optimized size
      const estimatedWebSize = this.estimateWebOptimizedSize(dimensions, format);

      // Generate recommendations
      const recommendations = this.generateOptimizationRecommendations(
        format,
        dimensions,
        fileSize,
        estimatedWebSize
      );

      return {
        format,
        dimensions,
        colorSpace: 'sRGB', // Placeholder
        hasAlpha: format === 'png' || format === 'webp',
        bitDepth: 8, // Placeholder
        compression: 'lossy', // Placeholder
        fileSize,
        estimatedWebSize,
        recommendations
      };
    } catch (error) {
      throw new CustomError(
        'IMAGE_ANALYSIS_FAILED',
        `Failed to analyze image: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      );
    }
  }

  /**
   * Generate multiple format variants for maximum compatibility
   */
  public async generateFormatVariants(
    imageData: Uint8Array,
    options: ImageOptimizationOptions = {}
  ): Promise<Record<string, OptimizationResult>> {
    const variants: Record<string, OptimizationResult> = {};
    const formats = this.FORMAT_PRIORITIES.modern;

    for (const format of formats) {
      try {
        const variantOptions = { ...options, format: format as any };
        variants[format] = await this.optimizeImage(imageData, variantOptions);
      } catch (error) {
        console.warn(`Failed to generate ${format} variant:`, error);
      }
    }

    return variants;
  }

  /**
   * Create a responsive image set
   */
  public async createResponsiveImageSet(
    imageData: Uint8Array,
    breakpoints: Array<{ width: number; suffix: string }>,
    options: ImageOptimizationOptions = {}
  ): Promise<Record<string, OptimizationResult>> {
    const responsiveSet: Record<string, OptimizationResult> = {};

    for (const breakpoint of breakpoints) {
      try {
        const responsiveOptions = {
          ...options,
          width: breakpoint.width,
          height: undefined, // Let it scale proportionally
          maintainAspectRatio: true
        };

        responsiveSet[breakpoint.suffix] = await this.optimizeImage(
          imageData,
          responsiveOptions
        );
      } catch (error) {
        console.warn(`Failed to generate responsive image for ${breakpoint.suffix}:`, error);
      }
    }

    return responsiveSet;
  }

  /**
   * Optimize for specific use cases
   */
  public async optimizeForUseCase(
    imageData: Uint8Array,
    useCase: 'avatar' | 'banner' | 'thumbnail' | 'gallery' | 'social',
    options: ImageOptimizationOptions = {}
  ): Promise<OptimizationResult> {
    const useCaseConfigs = {
      avatar: {
        width: 256,
        height: 256,
        format: 'webp' as const,
        quality: 90,
        generateThumbnails: true,
        thumbnailSizes: [
          { width: 64, height: 64, suffix: '_xs' },
          { width: 128, height: 128, suffix: '_sm' },
          { width: 256, height: 256, suffix: '_md' }
        ]
      },
      banner: {
        width: 1920,
        height: 1080,
        format: 'webp' as const,
        quality: 85,
        generateThumbnails: true,
        thumbnailSizes: [
          { width: 480, height: 270, suffix: '_mobile' },
          { width: 960, height: 540, suffix: '_tablet' },
          { width: 1920, height: 1080, suffix: '_desktop' }
        ]
      },
      thumbnail: {
        width: 300,
        height: 300,
        format: 'webp' as const,
        quality: 80,
        generateThumbnails: false
      },
      gallery: {
        width: 1200,
        height: 800,
        format: 'webp' as const,
        quality: 85,
        generateThumbnails: true,
        thumbnailSizes: [
          { width: 150, height: 150, suffix: '_thumb' },
          { width: 300, height: 300, suffix: '_small' },
          { width: 600, height: 600, suffix: '_medium' }
        ]
      },
      social: {
        width: 1200,
        height: 630,
        format: 'jpeg' as const,
        quality: 90,
        generateThumbnails: false
      }
    };

    const config = useCaseConfigs[useCase];
    const mergedOptions = { ...config, ...options };

    return this.optimizeImage(imageData, mergedOptions);
  }

  /**
   * Batch optimize multiple images
   */
  public async batchOptimize(
    images: Array<{ data: Uint8Array; id: string; options?: ImageOptimizationOptions }>,
    concurrency: number = 3
  ): Promise<Record<string, OptimizationResult>> {
    const results: Record<string, OptimizationResult> = {};
    const chunks = this.chunkArray(images, concurrency);

    for (const chunk of chunks) {
      const promises = chunk.map(async ({ data, id, options }) => {
        try {
          const result = await this.optimizeImage(data, options);
          return { id, result };
        } catch (error) {
          console.error(`Failed to optimize image ${id}:`, error);
          return { id, error };
        }
      });

      const chunkResults = await Promise.all(promises);
      
      for (const { id, result, error } of chunkResults) {
        if (error) {
          results[id] = {
            originalSize: 0,
            optimizedSize: 0,
            compressionRatio: 0,
            format: 'unknown',
            dimensions: { width: 0, height: 0 },
            metadata: {
              processingTime: 0,
              algorithm: 'failed',
              quality: 0,
              progressive: false
            }
          };
        } else {
          results[id] = result;
        }
      }
    }

    return results;
  }

  // Private helper methods

  private async performOptimization(
    imageData: Uint8Array,
    options: Required<ImageOptimizationOptions>
  ): Promise<Uint8Array> {
    // This is a placeholder implementation
    // In a real implementation, you would use Sharp or similar library
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // For now, return the original data
    // In reality, this would perform actual image optimization
    return imageData;
  }

  private async generateThumbnails(
    imageData: Uint8Array,
    sizes: Array<{ width: number; height: number; suffix: string }>,
    options: Required<ImageOptimizationOptions>
  ): Promise<OptimizationResult['thumbnails']> {
    const thumbnails: OptimizationResult['thumbnails'] = [];

    for (const size of sizes) {
      try {
        const thumbnailData = await this.performOptimization(imageData, {
          ...options,
          width: size.width,
          height: size.height
        });

        thumbnails.push({
          size: { width: size.width, height: size.height },
          suffix: size.suffix,
          data: thumbnailData,
          fileSize: thumbnailData.length
        });
      } catch (error) {
        console.warn(`Failed to generate thumbnail ${size.suffix}:`, error);
      }
    }

    return thumbnails;
  }

  private detectImageFormat(imageData: Uint8Array): string {
    // Check magic bytes
    if (imageData[0] === 0xFF && imageData[1] === 0xD8 && imageData[2] === 0xFF) {
      return 'jpeg';
    }
    if (imageData[0] === 0x89 && imageData[1] === 0x50 && imageData[2] === 0x4E && imageData[3] === 0x47) {
      return 'png';
    }
    if (imageData[0] === 0x47 && imageData[1] === 0x49 && imageData[2] === 0x46) {
      return 'gif';
    }
    if (imageData[8] === 0x57 && imageData[9] === 0x45 && imageData[10] === 0x42 && imageData[11] === 0x50) {
      return 'webp';
    }
    if (imageData[0] === 0x00 && imageData[1] === 0x00 && imageData[2] === 0x00 && imageData[3] === 0x20) {
      return 'avif';
    }
    
    return 'unknown';
  }

  private extractImageDimensions(imageData: Uint8Array, format: string): { width: number; height: number } {
    // This is a placeholder implementation
    // In a real implementation, you would parse the actual image headers
    
    // For now, return default dimensions
    return { width: 1920, height: 1080 };
  }

  private selectOptimalFormat(
    analysis: ImageAnalysis,
    options: Required<ImageOptimizationOptions>
  ): string {
    if (options.optimizeForWeb) {
      // Prefer modern formats for web
      if (analysis.hasAlpha) {
        return 'webp'; // WebP supports alpha channel
      } else {
        return 'avif'; // AVIF for better compression
      }
    }

    // Fallback to original format or JPEG
    return analysis.format === 'png' && !analysis.hasAlpha ? 'jpeg' : analysis.format;
  }

  private calculateOptimalDimensions(
    originalDimensions: { width: number; height: number },
    options: Required<ImageOptimizationOptions>
  ): { width: number; height: number } {
    if (!options.maintainAspectRatio) {
      return { width: options.width, height: options.height };
    }

    const aspectRatio = originalDimensions.width / originalDimensions.height;
    
    if (originalDimensions.width <= options.width && originalDimensions.height <= options.height) {
      return originalDimensions; // No upscaling
    }

    if (aspectRatio > 1) {
      // Landscape
      return {
        width: options.width,
        height: Math.round(options.width / aspectRatio)
      };
    } else {
      // Portrait
      return {
        width: Math.round(options.height * aspectRatio),
        height: options.height
      };
    }
  }

  private estimateWebOptimizedSize(
    dimensions: { width: number; height: number },
    format: string
  ): number {
    const pixelCount = dimensions.width * dimensions.height;
    const bytesPerPixel = this.getBytesPerPixel(format);
    return Math.round(pixelCount * bytesPerPixel * 0.7); // 70% compression estimate
  }

  private getBytesPerPixel(format: string): number {
    const bytesPerPixelMap: Record<string, number> = {
      jpeg: 1.5,
      png: 4,
      gif: 1,
      webp: 2,
      avif: 1.2
    };
    return bytesPerPixelMap[format] || 2;
  }

  private generateOptimizationRecommendations(
    format: string,
    dimensions: { width: number; height: number },
    fileSize: number,
    estimatedWebSize: number
  ): string[] {
    const recommendations: string[] = [];

    // Format recommendations
    if (format === 'png' && !this.hasTransparency(format)) {
      recommendations.push('Consider converting to JPEG for better compression');
    }
    if (format === 'jpeg' || format === 'png') {
      recommendations.push('Consider converting to WebP for better compression');
    }

    // Size recommendations
    if (dimensions.width > 1920 || dimensions.height > 1080) {
      recommendations.push('Consider resizing for web display');
    }

    // Quality recommendations
    if (fileSize > estimatedWebSize * 2) {
      recommendations.push('File size is larger than expected, consider reducing quality');
    }

    return recommendations;
  }

  private hasTransparency(format: string): boolean {
    return format === 'png' || format === 'webp' || format === 'gif';
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Get optimization statistics
   */
  public getOptimizationStats(results: OptimizationResult[]): {
    totalOriginalSize: number;
    totalOptimizedSize: number;
    averageCompressionRatio: number;
    totalProcessingTime: number;
    formatDistribution: Record<string, number>;
  } {
    const stats = {
      totalOriginalSize: 0,
      totalOptimizedSize: 0,
      averageCompressionRatio: 0,
      totalProcessingTime: 0,
      formatDistribution: {} as Record<string, number>
    };

    for (const result of results) {
      stats.totalOriginalSize += result.originalSize;
      stats.totalOptimizedSize += result.optimizedSize;
      stats.totalProcessingTime += result.metadata.processingTime;
      
      stats.formatDistribution[result.format] = 
        (stats.formatDistribution[result.format] || 0) + 1;
    }

    stats.averageCompressionRatio = results.length > 0
      ? results.reduce((sum, r) => sum + r.compressionRatio, 0) / results.length
      : 0;

    return stats;
  }
}
