import { SupabaseClient } from '@supabase/supabase-js';
import { CustomError } from '../../../shared/errors/CustomError';

export interface StorageUploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

export interface StorageDeleteResult {
  success: boolean;
  error?: string;
}

export interface StorageFileInfo {
  name: string;
  size: number;
  mimeType: string;
  lastModified: Date;
  etag: string;
  metadata: Record<string, any>;
}

export interface StorageListResult {
  files: StorageFileInfo[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface StorageQuota {
  used: number;
  limit: number;
  percentage: number;
}

export class SupabaseStorage {
  private supabase: SupabaseClient;
  private bucketName: string;
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/avif',
    'image/svg+xml',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  constructor(supabase: SupabaseClient, bucketName: string = 'media') {
    this.supabase = supabase;
    this.bucketName = bucketName;
  }

  /**
   * Upload a file to Supabase Storage
   */
  public async uploadFile(
    path: string,
    file: File,
    options: {
      upsert?: boolean;
      contentType?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<StorageUploadResult> {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Prepare upload options
      const uploadOptions: any = {
        upsert: options.upsert || false,
        contentType: options.contentType || file.type
      };

      if (options.metadata) {
        uploadOptions.metadata = options.metadata;
      }

      // Upload file
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(path, file, uploadOptions);

      if (error) {
        return {
          success: false,
          error: `Upload failed: ${error.message}`
        };
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(path);

      return {
        success: true,
        url: urlData.publicUrl,
        path: data.path
      };
    } catch (error) {
      return {
        success: false,
        error: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Upload a buffer to Supabase Storage
   */
  public async uploadBuffer(
    path: string,
    buffer: Buffer,
    contentType: string,
    options: {
      upsert?: boolean;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<StorageUploadResult> {
    try {
      // Validate buffer
      if (buffer.length > this.MAX_FILE_SIZE) {
        return {
          success: false,
          error: `File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE} bytes`
        };
      }

      // Prepare upload options
      const uploadOptions: any = {
        upsert: options.upsert || false,
        contentType
      };

      if (options.metadata) {
        uploadOptions.metadata = options.metadata;
      }

      // Upload buffer
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(path, buffer, uploadOptions);

      if (error) {
        return {
          success: false,
          error: `Upload failed: ${error.message}`
        };
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(path);

      return {
        success: true,
        url: urlData.publicUrl,
        path: data.path
      };
    } catch (error) {
      return {
        success: false,
        error: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Download a file from Supabase Storage
   */
  public async downloadFile(path: string): Promise<Buffer | null> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .download(path);

      if (error) {
        throw new CustomError(`Download failed: ${error.message}`, 404);
      }

      if (!data) {
        return null;
      }

      const arrayBuffer = await data.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      throw new CustomError(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  /**
   * Delete a file from Supabase Storage
   */
  public async deleteFile(path: string): Promise<StorageDeleteResult> {
    try {
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove([path]);

      if (error) {
        return {
          success: false,
          error: `Delete failed: ${error.message}`
        };
      }

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: `Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Delete multiple files from Supabase Storage
   */
  public async deleteFiles(paths: string[]): Promise<StorageDeleteResult> {
    try {
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove(paths);

      if (error) {
        return {
          success: false,
          error: `Delete failed: ${error.message}`
        };
      }

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: `Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * List files in a directory
   */
  public async listFiles(
    path: string = '',
    options: {
      limit?: number;
      offset?: number;
      sortBy?: { column: string; order: 'asc' | 'desc' };
    } = {}
  ): Promise<StorageListResult> {
    try {
      const { limit = 100, offset = 0, sortBy = { column: 'name', order: 'asc' } } = options;

      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .list(path, {
          limit,
          offset,
          sortBy
        });

      if (error) {
        throw new CustomError(`List files failed: ${error.message}`, 500);
      }

      const files: StorageFileInfo[] = (data || []).map(file => ({
        name: file.name,
        size: file.metadata?.size || 0,
        mimeType: file.metadata?.mimetype || 'application/octet-stream',
        lastModified: new Date(file.updated_at),
        etag: file.etag || '',
        metadata: file.metadata || {}
      }));

      return {
        files,
        total: files.length,
        hasMore: files.length === limit,
        nextCursor: files.length === limit ? String(offset + limit) : undefined
      };
    } catch (error) {
      throw new CustomError(`List files failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  /**
   * Get file information
   */
  public async getFileInfo(path: string): Promise<StorageFileInfo | null> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .list(path.split('/').slice(0, -1).join('/'), {
          limit: 1,
          offset: 0
        });

      if (error) {
        throw new CustomError(`Get file info failed: ${error.message}`, 404);
      }

      const fileName = path.split('/').pop();
      const file = data?.find(f => f.name === fileName);

      if (!file) {
        return null;
      }

      return {
        name: file.name,
        size: file.metadata?.size || 0,
        mimeType: file.metadata?.mimetype || 'application/octet-stream',
        lastModified: new Date(file.updated_at),
        etag: file.etag || '',
        metadata: file.metadata || {}
      };
    } catch (error) {
      throw new CustomError(`Get file info failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  /**
   * Get public URL for a file
   */
  public getPublicUrl(path: string): string {
    const { data } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  /**
   * Create a signed URL for private access
   */
  public async createSignedUrl(
    path: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .createSignedUrl(path, expiresIn);

      if (error) {
        throw new CustomError(`Create signed URL failed: ${error.message}`, 500);
      }

      return data.signedUrl;
    } catch (error) {
      throw new CustomError(`Create signed URL failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  /**
   * Copy a file
   */
  public async copyFile(
    sourcePath: string,
    destinationPath: string
  ): Promise<StorageUploadResult> {
    try {
      // Download source file
      const buffer = await this.downloadFile(sourcePath);
      if (!buffer) {
        return {
          success: false,
          error: 'Source file not found'
        };
      }

      // Get source file info
      const sourceInfo = await this.getFileInfo(sourcePath);
      if (!sourceInfo) {
        return {
          success: false,
          error: 'Source file info not found'
        };
      }

      // Upload to destination
      return await this.uploadBuffer(
        destinationPath,
        buffer,
        sourceInfo.mimeType,
        {
          upsert: true,
          metadata: sourceInfo.metadata
        }
      );
    } catch (error) {
      return {
        success: false,
        error: `Copy failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Move a file (copy + delete)
   */
  public async moveFile(
    sourcePath: string,
    destinationPath: string
  ): Promise<StorageUploadResult> {
    try {
      // Copy file
      const copyResult = await this.copyFile(sourcePath, destinationPath);
      if (!copyResult.success) {
        return copyResult;
      }

      // Delete source file
      const deleteResult = await this.deleteFile(sourcePath);
      if (!deleteResult.success) {
        // If delete fails, we should clean up the copied file
        await this.deleteFile(destinationPath);
        return {
          success: false,
          error: `Move failed: ${deleteResult.error}`
        };
      }

      return copyResult;
    } catch (error) {
      return {
        success: false,
        error: `Move failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get storage quota information
   */
  public async getQuota(): Promise<StorageQuota> {
    try {
      // This would need to be implemented based on your Supabase plan
      // For now, return a placeholder
      return {
        used: 0,
        limit: 1024 * 1024 * 1024, // 1GB
        percentage: 0
      };
    } catch (error) {
      throw new CustomError(`Get quota failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  /**
   * Create a directory
   */
  public async createDirectory(path: string): Promise<StorageUploadResult> {
    try {
      // Create a placeholder file to create the directory
      const placeholderPath = `${path}/.keep`;
      const placeholderContent = Buffer.from('');

      return await this.uploadBuffer(
        placeholderPath,
        placeholderContent,
        'text/plain',
        { upsert: true }
      );
    } catch (error) {
      return {
        success: false,
        error: `Create directory failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Delete a directory and all its contents
   */
  public async deleteDirectory(path: string): Promise<StorageDeleteResult> {
    try {
      // List all files in directory
      const listResult = await this.listFiles(path, { limit: 1000 });
      
      if (listResult.files.length === 0) {
        return { success: true };
      }

      // Delete all files
      const paths = listResult.files.map(file => `${path}/${file.name}`);
      return await this.deleteFiles(paths);
    } catch (error) {
      return {
        success: false,
        error: `Delete directory failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Check if a file exists
   */
  public async fileExists(path: string): Promise<boolean> {
    try {
      const info = await this.getFileInfo(path);
      return info !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file size
   */
  public async getFileSize(path: string): Promise<number> {
    try {
      const info = await this.getFileInfo(path);
      return info?.size || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Validate file before upload
   */
  private validateFile(file: File): { isValid: boolean; error?: string } {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE} bytes`
      };
    }

    // Check MIME type
    if (!this.ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        isValid: false,
        error: `File type ${file.type} is not allowed`
      };
    }

    // Check file name
    if (!file.name || file.name.trim().length === 0) {
      return {
        isValid: false,
        error: 'File name is required'
      };
    }

    // Check for malicious file names
    if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
      return {
        isValid: false,
        error: 'File name contains invalid characters'
      };
    }

    return { isValid: true };
  }

  /**
   * Generate a unique file path
   */
  public generateUniquePath(
    userId: string,
    type: string,
    fileName: string,
    options: {
      includeTimestamp?: boolean;
      includeRandom?: boolean;
      customPrefix?: string;
    } = {}
  ): string {
    const { includeTimestamp = true, includeRandom = true, customPrefix } = options;
    
    const timestamp = includeTimestamp ? Date.now() : '';
    const random = includeRandom ? Math.random().toString(36).substr(2, 9) : '';
    const prefix = customPrefix || '';
    
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    const extension = fileName.split('.').pop()?.toLowerCase() || 'bin';
    const baseName = fileName.split('.').slice(0, -1).join('.');
    
    const uniqueId = [prefix, timestamp, random].filter(Boolean).join('_');
    
    return `users/${userId}/${type}/${year}/${month}/${baseName}_${uniqueId}.${extension}`;
  }

  /**
   * Get storage statistics
   */
  public async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    averageFileSize: number;
    filesByType: Record<string, { count: number; size: number }>;
    oldestFile?: Date;
    newestFile?: Date;
  }> {
    try {
      // This would need to be implemented by querying all files
      // For now, return placeholder data
      return {
        totalFiles: 0,
        totalSize: 0,
        averageFileSize: 0,
        filesByType: {},
        oldestFile: undefined,
        newestFile: undefined
      };
    } catch (error) {
      throw new CustomError(`Get storage stats failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  /**
   * Clean up orphaned files
   */
  public async cleanupOrphanedFiles(): Promise<{
    filesDeleted: number;
    storageFreed: number;
    errors: string[];
  }> {
    try {
      // This would need to be implemented by comparing storage files with database records
      // For now, return placeholder data
      return {
        filesDeleted: 0,
        storageFreed: 0,
        errors: []
      };
    } catch (error) {
      throw new CustomError(`Cleanup orphaned files failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }
}
