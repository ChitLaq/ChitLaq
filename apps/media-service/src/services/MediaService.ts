import { SupabaseClient } from '@supabase/supabase-js';
import { ImageProcessor } from '../processors/ImageProcessor';
import { SupabaseStorage } from '../storage/SupabaseStorage';
import { FileValidator } from '../security/FileValidator';
import { ImageOptimizer } from '../utils/image-optimizer';
import { CustomError } from '../../../shared/errors/CustomError';

export interface MediaUploadResult {
  success: boolean;
  fileId: string;
  originalUrl: string;
  processedUrls: {
    thumbnail: string;
    medium: string;
    large: string;
    webp: string;
    avif: string;
  };
  metadata: {
    originalSize: number;
    processedSize: number;
    compressionRatio: number;
    dimensions: {
      width: number;
      height: number;
    };
    format: string;
    mimeType: string;
  };
  processingTime: number;
  errors: string[];
  warnings: string[];
}

export interface MediaFile {
  id: string;
  userId: string;
  fileName: string;
  originalName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  dimensions: {
    width: number;
    height: number;
  };
  format: string;
  isProcessed: boolean;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaQuota {
  userId: string;
  totalStorageUsed: number;
  totalFiles: number;
  maxStorageAllowed: number;
  maxFilesAllowed: number;
  storageUsagePercentage: number;
  filesUsagePercentage: number;
  lastUpdated: Date;
}

export interface MediaCleanupResult {
  filesDeleted: number;
  storageFreed: number;
  errors: string[];
  processingTime: number;
}

export class MediaService {
  private supabase: SupabaseClient;
  private imageProcessor: ImageProcessor;
  private storage: SupabaseStorage;
  private fileValidator: FileValidator;
  private imageOptimizer: ImageOptimizer;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.imageProcessor = new ImageProcessor();
    this.storage = new SupabaseStorage(supabase);
    this.fileValidator = new FileValidator();
    this.imageOptimizer = new ImageOptimizer();
  }

  /**
   * Upload and process a media file
   */
  public async uploadMedia(
    userId: string,
    file: File,
    options: {
      type: 'avatar' | 'banner' | 'post' | 'document';
      quality?: number;
      generateThumbnails?: boolean;
      stripMetadata?: boolean;
      scanForMalware?: boolean;
    } = { type: 'avatar' }
  ): Promise<MediaUploadResult> {
    const startTime = Date.now();
    const result: MediaUploadResult = {
      success: false,
      fileId: '',
      originalUrl: '',
      processedUrls: {
        thumbnail: '',
        medium: '',
        large: '',
        webp: '',
        avif: ''
      },
      metadata: {
        originalSize: 0,
        processedSize: 0,
        compressionRatio: 0,
        dimensions: { width: 0, height: 0 },
        format: '',
        mimeType: ''
      },
      processingTime: 0,
      errors: [],
      warnings: []
    };

    try {
      // Check user quota
      const quota = await this.getUserQuota(userId);
      if (quota.storageUsagePercentage >= 100) {
        result.errors.push('Storage quota exceeded');
        return result;
      }

      if (quota.filesUsagePercentage >= 100) {
        result.errors.push('File quota exceeded');
        return result;
      }

      // Validate file
      const validation = await this.fileValidator.validateFile(file, options.type);
      if (!validation.isValid) {
        result.errors.push(...validation.errors);
        return result;
      }

      if (validation.warnings.length > 0) {
        result.warnings.push(...validation.warnings);
      }

      // Generate unique file ID and path
      const fileId = this.generateFileId();
      const filePath = this.generateFilePath(userId, options.type, fileId, file.name);

      // Upload original file
      const uploadResult = await this.storage.uploadFile(filePath, file);
      if (!uploadResult.success) {
        result.errors.push(`Upload failed: ${uploadResult.error}`);
        return result;
      }

      result.originalUrl = uploadResult.url;
      result.fileId = fileId;

      // Store file metadata
      const mediaFile: MediaFile = {
        id: fileId,
        userId,
        fileName: file.name,
        originalName: file.name,
        filePath,
        mimeType: file.type,
        fileSize: file.size,
        dimensions: { width: 0, height: 0 }, // Will be updated after processing
        format: this.getFileFormat(file.type),
        isProcessed: false,
        processingStatus: 'pending',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.storeFileMetadata(mediaFile);

      // Process image if it's an image file
      if (this.isImageFile(file.type)) {
        const processingResult = await this.processImage(file, fileId, filePath, options);
        
        if (processingResult.success) {
          result.processedUrls = processingResult.processedUrls;
          result.metadata = processingResult.metadata;
          
          // Update file metadata with processed information
          await this.updateFileMetadata(fileId, {
            isProcessed: true,
            processingStatus: 'completed',
            dimensions: result.metadata.dimensions,
            metadata: {
              ...mediaFile.metadata,
              ...result.metadata
            }
          });
        } else {
          result.errors.push(...processingResult.errors);
          await this.updateFileMetadata(fileId, {
            processingStatus: 'failed'
          });
        }
      } else {
        // For non-image files, just store the original
        result.metadata = {
          originalSize: file.size,
          processedSize: file.size,
          compressionRatio: 1,
          dimensions: { width: 0, height: 0 },
          format: this.getFileFormat(file.type),
          mimeType: file.type
        };
      }

      result.processingTime = Date.now() - startTime;
      result.success = result.errors.length === 0;

      // Update user quota
      await this.updateUserQuota(userId, file.size);

    } catch (error) {
      result.errors.push(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.processingTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Process an uploaded image
   */
  private async processImage(
    file: File,
    fileId: string,
    filePath: string,
    options: {
      type: 'avatar' | 'banner' | 'post' | 'document';
      quality?: number;
      generateThumbnails?: boolean;
      stripMetadata?: boolean;
      scanForMalware?: boolean;
    }
  ): Promise<{
    success: boolean;
    processedUrls: MediaUploadResult['processedUrls'];
    metadata: MediaUploadResult['metadata'];
    errors: string[];
  }> {
    const result = {
      success: false,
      processedUrls: {
        thumbnail: '',
        medium: '',
        large: '',
        webp: '',
        avif: ''
      },
      metadata: {
        originalSize: 0,
        processedSize: 0,
        compressionRatio: 0,
        dimensions: { width: 0, height: 0 },
        format: '',
        mimeType: ''
      },
      errors: [] as string[]
    };

    try {
      // Get image dimensions and metadata
      const imageInfo = await this.imageProcessor.getImageInfo(file);
      result.metadata.dimensions = imageInfo.dimensions;
      result.metadata.originalSize = file.size;
      result.metadata.format = imageInfo.format;
      result.metadata.mimeType = file.type;

      // Process different sizes based on type
      const sizes = this.getImageSizes(options.type);
      const quality = options.quality || this.getDefaultQuality(options.type);

      // Generate thumbnail
      if (options.generateThumbnails !== false && sizes.thumbnail) {
        const thumbnailBuffer = await this.imageProcessor.resizeImage(
          file,
          sizes.thumbnail.width,
          sizes.thumbnail.height,
          { quality, format: 'webp' }
        );

        const thumbnailPath = this.generateProcessedFilePath(filePath, 'thumbnail', 'webp');
        const thumbnailUpload = await this.storage.uploadBuffer(thumbnailPath, thumbnailBuffer, 'image/webp');
        
        if (thumbnailUpload.success) {
          result.processedUrls.thumbnail = thumbnailUpload.url;
        }
      }

      // Generate medium size
      if (sizes.medium) {
        const mediumBuffer = await this.imageProcessor.resizeImage(
          file,
          sizes.medium.width,
          sizes.medium.height,
          { quality, format: 'webp' }
        );

        const mediumPath = this.generateProcessedFilePath(filePath, 'medium', 'webp');
        const mediumUpload = await this.storage.uploadBuffer(mediumPath, mediumBuffer, 'image/webp');
        
        if (mediumUpload.success) {
          result.processedUrls.medium = mediumUpload.url;
        }
      }

      // Generate large size
      if (sizes.large) {
        const largeBuffer = await this.imageProcessor.resizeImage(
          file,
          sizes.large.width,
          sizes.large.height,
          { quality, format: 'webp' }
        );

        const largePath = this.generateProcessedFilePath(filePath, 'large', 'webp');
        const largeUpload = await this.storage.uploadBuffer(largePath, largeBuffer, 'image/webp');
        
        if (largeUpload.success) {
          result.processedUrls.large = largeUpload.url;
        }
      }

      // Generate WebP version
      const webpBuffer = await this.imageProcessor.convertToWebP(file, { quality });
      const webpPath = this.generateProcessedFilePath(filePath, 'original', 'webp');
      const webpUpload = await this.storage.uploadBuffer(webpPath, webpBuffer, 'image/webp');
      
      if (webpUpload.success) {
        result.processedUrls.webp = webpUpload.url;
      }

      // Generate AVIF version (if supported)
      try {
        const avifBuffer = await this.imageProcessor.convertToAVIF(file, { quality });
        const avifPath = this.generateProcessedFilePath(filePath, 'original', 'avif');
        const avifUpload = await this.storage.uploadBuffer(avifPath, avifBuffer, 'image/avif');
        
        if (avifUpload.success) {
          result.processedUrls.avif = avifUpload.url;
        }
      } catch (error) {
        // AVIF not supported, skip
      }

      // Calculate compression ratio
      const totalProcessedSize = Object.values(result.processedUrls)
        .filter(url => url)
        .reduce((total, url) => {
          // This would need to be calculated from actual file sizes
          return total + (file.size * 0.3); // Estimate
        }, 0);

      result.metadata.processedSize = totalProcessedSize;
      result.metadata.compressionRatio = totalProcessedSize / file.size;

      result.success = true;

    } catch (error) {
      result.errors.push(`Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Get user's media quota information
   */
  public async getUserQuota(userId: string): Promise<MediaQuota> {
    try {
      const { data, error } = await this.supabase
        .from('user_media_quotas')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new CustomError(`Failed to get user quota: ${error.message}`, 500);
      }

      if (!data) {
        // Create default quota
        const defaultQuota: MediaQuota = {
          userId,
          totalStorageUsed: 0,
          totalFiles: 0,
          maxStorageAllowed: 100 * 1024 * 1024, // 100MB
          maxFilesAllowed: 50,
          storageUsagePercentage: 0,
          filesUsagePercentage: 0,
          lastUpdated: new Date()
        };

        await this.createUserQuota(defaultQuota);
        return defaultQuota;
      }

      return {
        userId: data.user_id,
        totalStorageUsed: data.total_storage_used,
        totalFiles: data.total_files,
        maxStorageAllowed: data.max_storage_allowed,
        maxFilesAllowed: data.max_files_allowed,
        storageUsagePercentage: (data.total_storage_used / data.max_storage_allowed) * 100,
        filesUsagePercentage: (data.total_files / data.max_files_allowed) * 100,
        lastUpdated: new Date(data.last_updated)
      };
    } catch (error) {
      throw new CustomError(`Failed to get user quota: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  /**
   * Update user's media quota
   */
  private async updateUserQuota(userId: string, additionalSize: number): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('user_media_quotas')
        .update({
          total_storage_used: this.supabase.raw('total_storage_used + ?', [additionalSize]),
          total_files: this.supabase.raw('total_files + 1'),
          last_updated: new Date()
        })
        .eq('user_id', userId);

      if (error) {
        throw new CustomError(`Failed to update user quota: ${error.message}`, 500);
      }
    } catch (error) {
      throw new CustomError(`Failed to update user quota: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  /**
   * Create user quota record
   */
  private async createUserQuota(quota: MediaQuota): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('user_media_quotas')
        .insert({
          user_id: quota.userId,
          total_storage_used: quota.totalStorageUsed,
          total_files: quota.totalFiles,
          max_storage_allowed: quota.maxStorageAllowed,
          max_files_allowed: quota.maxFilesAllowed,
          last_updated: quota.lastUpdated
        });

      if (error) {
        throw new CustomError(`Failed to create user quota: ${error.message}`, 500);
      }
    } catch (error) {
      throw new CustomError(`Failed to create user quota: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  /**
   * Get user's media files
   */
  public async getUserMediaFiles(
    userId: string,
    options: {
      type?: 'avatar' | 'banner' | 'post' | 'document';
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    files: MediaFile[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const { page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      let query = this.supabase
        .from('user_media_files')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (options.type) {
        query = query.eq('type', options.type);
      }

      const { data, error, count } = await query;

      if (error) {
        throw new CustomError(`Failed to get user media files: ${error.message}`, 500);
      }

      const files = (data || []).map(this.mapDatabaseToMediaFile);
      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        files,
        total,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      throw new CustomError(`Failed to get user media files: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  /**
   * Delete a media file
   */
  public async deleteMediaFile(fileId: string, userId: string): Promise<boolean> {
    try {
      // Get file information
      const { data: fileData, error: fileError } = await this.supabase
        .from('user_media_files')
        .select('*')
        .eq('id', fileId)
        .eq('user_id', userId)
        .single();

      if (fileError || !fileData) {
        throw new CustomError('File not found', 404);
      }

      // Delete from storage
      const deleteResult = await this.storage.deleteFile(fileData.file_path);
      if (!deleteResult.success) {
        throw new CustomError(`Failed to delete file from storage: ${deleteResult.error}`, 500);
      }

      // Delete processed versions
      const processedPaths = this.getProcessedFilePaths(fileData.file_path);
      for (const path of processedPaths) {
        await this.storage.deleteFile(path);
      }

      // Delete from database
      const { error: dbError } = await this.supabase
        .from('user_media_files')
        .delete()
        .eq('id', fileId)
        .eq('user_id', userId);

      if (dbError) {
        throw new CustomError(`Failed to delete file from database: ${dbError.message}`, 500);
      }

      // Update user quota
      await this.updateUserQuotaAfterDeletion(userId, fileData.file_size);

      return true;
    } catch (error) {
      throw new CustomError(`Failed to delete media file: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  /**
   * Clean up unused media files
   */
  public async cleanupUnusedFiles(): Promise<MediaCleanupResult> {
    const startTime = Date.now();
    const result: MediaCleanupResult = {
      filesDeleted: 0,
      storageFreed: 0,
      errors: [],
      processingTime: 0
    };

    try {
      // Find files that haven't been accessed in 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: unusedFiles, error } = await this.supabase
        .from('user_media_files')
        .select('*')
        .lt('last_accessed', thirtyDaysAgo.toISOString())
        .eq('is_processed', true);

      if (error) {
        result.errors.push(`Failed to find unused files: ${error.message}`);
        return result;
      }

      for (const file of unusedFiles || []) {
        try {
          // Delete from storage
          const deleteResult = await this.storage.deleteFile(file.file_path);
          if (deleteResult.success) {
            // Delete processed versions
            const processedPaths = this.getProcessedFilePaths(file.file_path);
            for (const path of processedPaths) {
              await this.storage.deleteFile(path);
            }

            // Delete from database
            await this.supabase
              .from('user_media_files')
              .delete()
              .eq('id', file.id);

            result.filesDeleted++;
            result.storageFreed += file.file_size;

            // Update user quota
            await this.updateUserQuotaAfterDeletion(file.user_id, file.file_size);
          } else {
            result.errors.push(`Failed to delete file ${file.id}: ${deleteResult.error}`);
          }
        } catch (error) {
          result.errors.push(`Error processing file ${file.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

    } catch (error) {
      result.errors.push(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    result.processingTime = Date.now() - startTime;
    return result;
  }

  /**
   * Get storage cost analysis
   */
  public async getStorageCostAnalysis(): Promise<{
    totalStorageUsed: number;
    totalFiles: number;
    averageFileSize: number;
    storageByType: Record<string, { size: number; count: number }>;
    costEstimate: {
      monthly: number;
      yearly: number;
    };
    optimizationRecommendations: string[];
  }> {
    try {
      const { data: files, error } = await this.supabase
        .from('user_media_files')
        .select('file_size, type');

      if (error) {
        throw new CustomError(`Failed to get storage analysis: ${error.message}`, 500);
      }

      const totalStorageUsed = files?.reduce((sum, file) => sum + file.file_size, 0) || 0;
      const totalFiles = files?.length || 0;
      const averageFileSize = totalFiles > 0 ? totalStorageUsed / totalFiles : 0;

      const storageByType: Record<string, { size: number; count: number }> = {};
      files?.forEach(file => {
        if (!storageByType[file.type]) {
          storageByType[file.type] = { size: 0, count: 0 };
        }
        storageByType[file.type].size += file.file_size;
        storageByType[file.type].count += 1;
      });

      // Cost estimation (assuming $0.023 per GB per month)
      const storageGB = totalStorageUsed / (1024 * 1024 * 1024);
      const monthlyCost = storageGB * 0.023;
      const yearlyCost = monthlyCost * 12;

      const optimizationRecommendations = this.generateOptimizationRecommendations(
        totalStorageUsed,
        totalFiles,
        storageByType
      );

      return {
        totalStorageUsed,
        totalFiles,
        averageFileSize,
        storageByType,
        costEstimate: {
          monthly: monthlyCost,
          yearly: yearlyCost
        },
        optimizationRecommendations
      };
    } catch (error) {
      throw new CustomError(`Failed to get storage cost analysis: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  // Helper methods
  private generateFileId(): string {
    return `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateFilePath(userId: string, type: string, fileId: string, fileName: string): string {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const extension = fileName.split('.').pop()?.toLowerCase() || 'bin';
    return `users/${userId}/${type}/${year}/${month}/${fileId}.${extension}`;
  }

  private generateProcessedFilePath(originalPath: string, size: string, format: string): string {
    const pathParts = originalPath.split('.');
    const basePath = pathParts.slice(0, -1).join('.');
    return `${basePath}_${size}.${format}`;
  }

  private getProcessedFilePaths(originalPath: string): string[] {
    const sizes = ['thumbnail', 'medium', 'large', 'original'];
    const formats = ['webp', 'avif'];
    const paths: string[] = [];

    sizes.forEach(size => {
      formats.forEach(format => {
        paths.push(this.generateProcessedFilePath(originalPath, size, format));
      });
    });

    return paths;
  }

  private getFileFormat(mimeType: string): string {
    const formatMap: Record<string, string> = {
      'image/jpeg': 'jpeg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/avif': 'avif',
      'application/pdf': 'pdf',
      'text/plain': 'txt'
    };
    return formatMap[mimeType] || 'unknown';
  }

  private isImageFile(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  private getImageSizes(type: string): {
    thumbnail?: { width: number; height: number };
    medium?: { width: number; height: number };
    large?: { width: number; height: number };
  } {
    const sizeMap: Record<string, any> = {
      avatar: {
        thumbnail: { width: 64, height: 64 },
        medium: { width: 128, height: 128 },
        large: { width: 256, height: 256 }
      },
      banner: {
        thumbnail: { width: 200, height: 100 },
        medium: { width: 800, height: 400 },
        large: { width: 1600, height: 800 }
      },
      post: {
        thumbnail: { width: 150, height: 150 },
        medium: { width: 600, height: 600 },
        large: { width: 1200, height: 1200 }
      }
    };
    return sizeMap[type] || {};
  }

  private getDefaultQuality(type: string): number {
    const qualityMap: Record<string, number> = {
      avatar: 90,
      banner: 85,
      post: 80,
      document: 95
    };
    return qualityMap[type] || 80;
  }

  private async storeFileMetadata(mediaFile: MediaFile): Promise<void> {
    const { error } = await this.supabase
      .from('user_media_files')
      .insert({
        id: mediaFile.id,
        user_id: mediaFile.userId,
        file_name: mediaFile.fileName,
        original_name: mediaFile.originalName,
        file_path: mediaFile.filePath,
        mime_type: mediaFile.mimeType,
        file_size: mediaFile.fileSize,
        width: mediaFile.dimensions.width,
        height: mediaFile.dimensions.height,
        format: mediaFile.format,
        is_processed: mediaFile.isProcessed,
        processing_status: mediaFile.processingStatus,
        metadata: mediaFile.metadata,
        created_at: mediaFile.createdAt,
        updated_at: mediaFile.updatedAt
      });

    if (error) {
      throw new CustomError(`Failed to store file metadata: ${error.message}`, 500);
    }
  }

  private async updateFileMetadata(fileId: string, updates: Partial<MediaFile>): Promise<void> {
    const { error } = await this.supabase
      .from('user_media_files')
      .update({
        width: updates.dimensions?.width,
        height: updates.dimensions?.height,
        is_processed: updates.isProcessed,
        processing_status: updates.processingStatus,
        metadata: updates.metadata,
        updated_at: new Date()
      })
      .eq('id', fileId);

    if (error) {
      throw new CustomError(`Failed to update file metadata: ${error.message}`, 500);
    }
  }

  private async updateUserQuotaAfterDeletion(userId: string, fileSize: number): Promise<void> {
    const { error } = await this.supabase
      .from('user_media_quotas')
      .update({
        total_storage_used: this.supabase.raw('total_storage_used - ?', [fileSize]),
        total_files: this.supabase.raw('total_files - 1'),
        last_updated: new Date()
      })
      .eq('user_id', userId);

    if (error) {
      throw new CustomError(`Failed to update user quota after deletion: ${error.message}`, 500);
    }
  }

  private mapDatabaseToMediaFile(data: any): MediaFile {
    return {
      id: data.id,
      userId: data.user_id,
      fileName: data.file_name,
      originalName: data.original_name,
      filePath: data.file_path,
      mimeType: data.mime_type,
      fileSize: data.file_size,
      dimensions: { width: data.width, height: data.height },
      format: data.format,
      isProcessed: data.is_processed,
      processingStatus: data.processing_status,
      metadata: data.metadata || {},
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  private generateOptimizationRecommendations(
    totalStorage: number,
    totalFiles: number,
    storageByType: Record<string, { size: number; count: number }>
  ): string[] {
    const recommendations: string[] = [];

    if (totalStorage > 1024 * 1024 * 1024) { // > 1GB
      recommendations.push('Consider implementing more aggressive image compression');
    }

    if (totalFiles > 1000) {
      recommendations.push('Implement automatic cleanup of unused files');
    }

    if (storageByType.avatar && storageByType.avatar.size > 100 * 1024 * 1024) { // > 100MB
      recommendations.push('Optimize avatar image sizes and formats');
    }

    if (storageByType.banner && storageByType.banner.size > 500 * 1024 * 1024) { // > 500MB
      recommendations.push('Consider using CDN for banner images');
    }

    return recommendations;
  }
}
