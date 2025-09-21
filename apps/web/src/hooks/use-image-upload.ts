import { useState, useCallback, useRef } from 'react';
import { CustomError } from '../../../shared/errors/CustomError';

export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: string) => void;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  generateThumbnails?: boolean;
  cropEnabled?: boolean;
  aspectRatio?: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  stage: 'uploading' | 'processing' | 'optimizing' | 'complete';
}

export interface UploadResult {
  id: string;
  url: string;
  filename: string;
  size: number;
  type: string;
  dimensions?: { width: number; height: number };
  thumbnails?: Array<{
    size: { width: number; height: number };
    suffix: string;
    url: string;
  }>;
  metadata: {
    uploadedAt: string;
    processingTime: number;
    compressionRatio: number;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata: {
    size: number;
    mimeType: string;
    extension: string;
    isImage: boolean;
    isDocument: boolean;
    isVideo: boolean;
    isAudio: boolean;
  };
}

export interface UploadStats {
  totalUploads: number;
  successfulUploads: number;
  failedUploads: number;
  totalSize: number;
  averageProcessingTime: number;
  lastUpload?: UploadResult;
}

export const useImageUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadStats, setUploadStats] = useState<UploadStats>({
    totalUploads: 0,
    successfulUploads: 0,
    failedUploads: 0,
    totalSize: 0,
    averageProcessingTime: 0
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const uploadQueueRef = useRef<Array<{ file: File; type: string; options: UploadOptions }>>([]);
  const isProcessingQueueRef = useRef(false);

  /**
   * Validate a file before upload
   */
  const validateFile = useCallback(async (
    file: File,
    type: 'avatar' | 'banner' | 'post' | 'document'
  ): Promise<ValidationResult> => {
    try {
      setError(null);

      // Basic validation
      const errors: string[] = [];
      const warnings: string[] = [];

      // Check file size
      const maxSizes = {
        avatar: 5 * 1024 * 1024, // 5MB
        banner: 10 * 1024 * 1024, // 10MB
        post: 20 * 1024 * 1024, // 20MB
        document: 50 * 1024 * 1024 // 50MB
      };

      if (file.size > maxSizes[type]) {
        errors.push(`File size exceeds maximum allowed size of ${formatFileSize(maxSizes[type])}`);
      }

      // Check file type
      const allowedTypes = {
        avatar: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
        banner: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
        post: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'video/mp4', 'video/webm'],
        document: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      };

      if (!allowedTypes[type].includes(file.type)) {
        errors.push(`File type ${file.type} is not allowed for ${type} uploads`);
      }

      // Check file name
      if (!file.name || file.name.trim().length === 0) {
        errors.push('File name is required');
      }

      // Check for suspicious file names
      if (isSuspiciousFileName(file.name)) {
        errors.push('File name contains suspicious characters');
      }

      // Check file extension
      const extension = getFileExtension(file.name);
      const dangerousExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar'];
      if (dangerousExtensions.includes(extension.toLowerCase())) {
        errors.push(`File extension ${extension} is not allowed`);
      }

      // Generate metadata
      const metadata = {
        size: file.size,
        mimeType: file.type,
        extension,
        isImage: file.type.startsWith('image/'),
        isDocument: file.type.startsWith('application/') || file.type.startsWith('text/'),
        isVideo: file.type.startsWith('video/'),
        isAudio: file.type.startsWith('audio/')
      };

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        metadata
      };
    } catch (error) {
      throw new CustomError(
        'FILE_VALIDATION_FAILED',
        `File validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        400
      );
    }
  }, []);

  /**
   * Upload a single file
   */
  const uploadImage = useCallback(async (
    file: File,
    type: 'avatar' | 'banner' | 'post' | 'document',
    options: UploadOptions = {}
  ): Promise<UploadResult> => {
    try {
      setIsUploading(true);
      setError(null);

      // Create abort controller for this upload
      abortControllerRef.current = new AbortController();

      // Validate file first
      const validation = await validateFile(file, type);
      if (!validation.isValid) {
        throw new CustomError(
          'FILE_VALIDATION_FAILED',
          `File validation failed: ${validation.errors.join(', ')}`,
          400
        );
      }

      // Report progress
      options.onProgress?.({
        loaded: 0,
        total: file.size,
        percentage: 0,
        stage: 'uploading'
      });

      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      formData.append('quality', (options.quality || 85).toString());
      formData.append('format', options.format || 'webp');
      formData.append('generateThumbnails', (options.generateThumbnails || true).toString());
      formData.append('cropEnabled', (options.cropEnabled || false).toString());
      if (options.aspectRatio) {
        formData.append('aspectRatio', options.aspectRatio.toString());
      }

      // Upload file
      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new CustomError(
          'UPLOAD_FAILED',
          errorData.message || `Upload failed with status ${response.status}`,
          response.status
        );
      }

      // Report processing progress
      options.onProgress?.({
        loaded: file.size,
        total: file.size,
        percentage: 50,
        stage: 'processing'
      });

      // Parse response
      const result: UploadResult = await response.json();

      // Report optimization progress
      options.onProgress?.({
        loaded: file.size,
        total: file.size,
        percentage: 75,
        stage: 'optimizing'
      });

      // Report completion
      options.onProgress?.({
        loaded: file.size,
        total: file.size,
        percentage: 100,
        stage: 'complete'
      });

      // Update stats
      setUploadStats(prev => ({
        ...prev,
        totalUploads: prev.totalUploads + 1,
        successfulUploads: prev.successfulUploads + 1,
        totalSize: prev.totalSize + file.size,
        averageProcessingTime: (prev.averageProcessingTime + result.metadata.processingTime) / 2,
        lastUpload: result
      }));

      // Call success callback
      options.onSuccess?.(result);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setError(errorMessage);
      
      // Update stats
      setUploadStats(prev => ({
        ...prev,
        totalUploads: prev.totalUploads + 1,
        failedUploads: prev.failedUploads + 1
      }));

      // Call error callback
      options.onError?.(errorMessage);

      throw error;
    } finally {
      setIsUploading(false);
      abortControllerRef.current = null;
    }
  }, [validateFile]);

  /**
   * Upload multiple files
   */
  const uploadMultipleImages = useCallback(async (
    files: File[],
    type: 'avatar' | 'banner' | 'post' | 'document',
    options: UploadOptions = {}
  ): Promise<UploadResult[]> => {
    try {
      setIsUploading(true);
      setError(null);

      const results: UploadResult[] = [];
      const errors: string[] = [];

      // Upload files sequentially to avoid overwhelming the server
      for (const file of files) {
        try {
          const result = await uploadImage(file, type, options);
          results.push(result);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Upload failed';
          errors.push(`${file.name}: ${errorMessage}`);
        }
      }

      if (errors.length > 0) {
        setError(`Some uploads failed: ${errors.join(', ')}`);
      }

      return results;
    } finally {
      setIsUploading(false);
    }
  }, [uploadImage]);

  /**
   * Queue files for upload
   */
  const queueUpload = useCallback((
    file: File,
    type: 'avatar' | 'banner' | 'post' | 'document',
    options: UploadOptions = {}
  ) => {
    uploadQueueRef.current.push({ file, type, options });
    processUploadQueue();
  }, []);

  /**
   * Process upload queue
   */
  const processUploadQueue = useCallback(async () => {
    if (isProcessingQueueRef.current || uploadQueueRef.current.length === 0) {
      return;
    }

    isProcessingQueueRef.current = true;

    try {
      while (uploadQueueRef.current.length > 0) {
        const { file, type, options } = uploadQueueRef.current.shift()!;
        try {
          await uploadImage(file, type, options);
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
        }
      }
    } finally {
      isProcessingQueueRef.current = false;
    }
  }, [uploadImage]);

  /**
   * Cancel current upload
   */
  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsUploading(false);
      setError('Upload cancelled');
    }
  }, []);

  /**
   * Clear upload queue
   */
  const clearUploadQueue = useCallback(() => {
    uploadQueueRef.current = [];
  }, []);

  /**
   * Get upload progress for a specific file
   */
  const getUploadProgress = useCallback((filename: string): UploadProgress | null => {
    // This would typically come from a progress tracking system
    // For now, return null as progress is handled in the upload function
    return null;
  }, []);

  /**
   * Retry failed upload
   */
  const retryUpload = useCallback(async (
    file: File,
    type: 'avatar' | 'banner' | 'post' | 'document',
    options: UploadOptions = {}
  ): Promise<UploadResult> => {
    return uploadImage(file, type, options);
  }, [uploadImage]);

  /**
   * Get upload statistics
   */
  const getUploadStats = useCallback((): UploadStats => {
    return uploadStats;
  }, [uploadStats]);

  /**
   * Reset upload statistics
   */
  const resetUploadStats = useCallback(() => {
    setUploadStats({
      totalUploads: 0,
      successfulUploads: 0,
      failedUploads: 0,
      totalSize: 0,
      averageProcessingTime: 0
    });
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    isUploading,
    error,
    uploadStats,

    // Actions
    uploadImage,
    uploadMultipleImages,
    queueUpload,
    cancelUpload,
    clearUploadQueue,
    retryUpload,
    validateFile,

    // Utilities
    getUploadProgress,
    getUploadStats,
    resetUploadStats,
    clearError
  };
};

// Helper functions

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot !== -1 ? fileName.substring(lastDot) : '';
}

function isSuspiciousFileName(fileName: string): boolean {
  const suspiciousPatterns = [
    /\.\./, // Directory traversal
    /[<>:"|?*]/, // Invalid characters
    /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, // Reserved names
    /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar)$/i // Executable extensions
  ];

  return suspiciousPatterns.some(pattern => pattern.test(fileName));
}
