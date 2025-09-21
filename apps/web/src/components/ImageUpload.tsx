import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useImageUpload } from '../hooks/use-image-upload';
import './ImageUpload.css';

export interface ImageUploadProps {
  type: 'avatar' | 'banner' | 'post' | 'document';
  onUploadComplete: (result: UploadResult) => void;
  onUploadError: (error: string) => void;
  maxFileSize?: number;
  allowedFormats?: string[];
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  showPreview?: boolean;
  showProgress?: boolean;
  autoUpload?: boolean;
  cropEnabled?: boolean;
  aspectRatio?: number;
  placeholder?: string;
  accept?: string;
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

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  stage: 'uploading' | 'processing' | 'optimizing' | 'complete';
}

export interface DragDropState {
  isDragOver: boolean;
  isDragValid: boolean;
  dragCounter: number;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  type,
  onUploadComplete,
  onUploadError,
  maxFileSize,
  allowedFormats,
  multiple = false,
  disabled = false,
  className = '',
  showPreview = true,
  showProgress = true,
  autoUpload = true,
  cropEnabled = false,
  aspectRatio,
  placeholder,
  accept
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  
  const [dragDropState, setDragDropState] = useState<DragDropState>({
    isDragOver: false,
    isDragValid: false,
    dragCounter: 0
  });
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress>>({});
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  const {
    uploadImage,
    validateFile,
    isUploading: hookIsUploading,
    error: hookError
  } = useImageUpload();

  // Update upload progress from hook
  useEffect(() => {
    if (hookIsUploading) {
      setIsUploading(true);
    } else {
      setIsUploading(false);
    }
  }, [hookIsUploading]);

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const newFiles = multiple ? [...selectedFiles, ...fileArray] : fileArray;
    
    setSelectedFiles(newFiles);
    setValidationErrors({});

    // Generate preview URLs
    const newPreviewUrls: Record<string, string> = {};
    newFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        newPreviewUrls[file.name] = URL.createObjectURL(file);
      }
    });
    setPreviewUrls(prev => ({ ...prev, ...newPreviewUrls }));

    // Auto-upload if enabled
    if (autoUpload) {
      handleUpload(newFiles);
    }
  }, [selectedFiles, multiple, autoUpload]);

  // Handle drag and drop
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragDropState(prev => ({
      ...prev,
      dragCounter: prev.dragCounter + 1,
      isDragOver: true
    }));

    // Validate dragged files
    const files = Array.from(e.dataTransfer.items).map(item => item.getAsFile()).filter(Boolean) as File[];
    const isValid = files.every(file => validateFileType(file));
    
    setDragDropState(prev => ({
      ...prev,
      isDragValid: isValid
    }));
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragDropState(prev => ({
      ...prev,
      dragCounter: prev.dragCounter - 1,
      isDragOver: prev.dragCounter <= 1 ? false : prev.isDragOver
    }));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragDropState({
      isDragOver: false,
      isDragValid: false,
      dragCounter: 0
    });

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    handleFileSelect(files as any);
  }, [disabled, handleFileSelect]);

  // Handle file input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  }, [handleFileSelect]);

  // Handle upload
  const handleUpload = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    setIsUploading(true);
    setValidationErrors({});

    try {
      const uploadPromises = files.map(async (file) => {
        try {
          // Validate file
          const validation = await validateFile(file, type);
          if (!validation.isValid) {
            setValidationErrors(prev => ({
              ...prev,
              [file.name]: validation.errors
            }));
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
          }

          // Upload file
          const result = await uploadImage(file, type, {
            onProgress: (progress) => {
              setUploadProgress(prev => ({
                ...prev,
                [file.name]: progress
              }));
            }
          });

          onUploadComplete(result);
          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Upload failed';
          onUploadError(errorMessage);
          throw error;
        }
      });

      await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress({});
    }
  }, [validateFile, uploadImage, type, onUploadComplete, onUploadError]);

  // Validate file type
  const validateFileType = useCallback((file: File): boolean => {
    if (maxFileSize && file.size > maxFileSize) {
      return false;
    }

    if (allowedFormats && !allowedFormats.includes(file.type)) {
      return false;
    }

    return true;
  }, [maxFileSize, allowedFormats]);

  // Remove file
  const removeFile = useCallback((filename: string) => {
    setSelectedFiles(prev => prev.filter(file => file.name !== filename));
    setPreviewUrls(prev => {
      const newUrls = { ...prev };
      if (newUrls[filename]) {
        URL.revokeObjectURL(newUrls[filename]);
        delete newUrls[filename];
      }
      return newUrls;
    });
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[filename];
      return newErrors;
    });
  }, []);

  // Clear all files
  const clearFiles = useCallback(() => {
    setSelectedFiles([]);
    Object.values(previewUrls).forEach(url => URL.revokeObjectURL(url));
    setPreviewUrls({});
    setValidationErrors({});
    setUploadProgress({});
  }, [previewUrls]);

  // Get file size in human readable format
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  // Get upload button text
  const getUploadButtonText = useCallback(() => {
    if (isUploading) return 'Uploading...';
    if (selectedFiles.length > 0) return `Upload ${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}`;
    return 'Select Files';
  }, [isUploading, selectedFiles.length]);

  // Get drop zone class name
  const getDropZoneClassName = useCallback(() => {
    const baseClass = 'image-upload-dropzone';
    const classes = [baseClass];
    
    if (dragDropState.isDragOver) {
      classes.push(`${baseClass}--drag-over`);
    }
    
    if (dragDropState.isDragValid) {
      classes.push(`${baseClass}--drag-valid`);
    } else if (dragDropState.isDragOver) {
      classes.push(`${baseClass}--drag-invalid`);
    }
    
    if (disabled) {
      classes.push(`${baseClass}--disabled`);
    }
    
    return classes.join(' ');
  }, [dragDropState, disabled]);

  return (
    <div className={`image-upload ${className}`}>
      {/* Drop Zone */}
      <div
        ref={dropZoneRef}
        className={getDropZoneClassName()}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept || allowedFormats?.join(',')}
          multiple={multiple}
          onChange={handleInputChange}
          style={{ display: 'none' }}
          disabled={disabled}
        />

        <div className="image-upload-content">
          {selectedFiles.length === 0 ? (
            <div className="image-upload-placeholder">
              <div className="image-upload-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7,10 12,15 17,10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
              <h3 className="image-upload-title">
                {placeholder || `Upload ${type} image${multiple ? 's' : ''}`}
              </h3>
              <p className="image-upload-description">
                Drag and drop your {type} image{multiple ? 's' : ''} here, or click to browse
              </p>
              {maxFileSize && (
                <p className="image-upload-limit">
                  Maximum file size: {formatFileSize(maxFileSize)}
                </p>
              )}
            </div>
          ) : (
            <div className="image-upload-files">
              {selectedFiles.map((file) => (
                <div key={file.name} className="image-upload-file">
                  {showPreview && file.type.startsWith('image/') && (
                    <div className="image-upload-preview">
                      <img
                        src={previewUrls[file.name]}
                        alt={file.name}
                        className="image-upload-preview-image"
                      />
                    </div>
                  )}
                  
                  <div className="image-upload-file-info">
                    <div className="image-upload-file-name">{file.name}</div>
                    <div className="image-upload-file-size">{formatFileSize(file.size)}</div>
                    
                    {validationErrors[file.name] && (
                      <div className="image-upload-file-errors">
                        {validationErrors[file.name].map((error, index) => (
                          <div key={index} className="image-upload-file-error">
                            {error}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {showProgress && uploadProgress[file.name] && (
                      <div className="image-upload-progress">
                        <div className="image-upload-progress-bar">
                          <div
                            className="image-upload-progress-fill"
                            style={{ width: `${uploadProgress[file.name].percentage}%` }}
                          />
                        </div>
                        <div className="image-upload-progress-text">
                          {uploadProgress[file.name].stage} ({uploadProgress[file.name].percentage}%)
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <button
                    type="button"
                    className="image-upload-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(file.name);
                    }}
                    disabled={isUploading}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {selectedFiles.length > 0 && (
        <div className="image-upload-actions">
          <button
            type="button"
            className="image-upload-button image-upload-button--primary"
            onClick={() => handleUpload(selectedFiles)}
            disabled={isUploading || disabled}
          >
            {getUploadButtonText()}
          </button>
          
          <button
            type="button"
            className="image-upload-button image-upload-button--secondary"
            onClick={clearFiles}
            disabled={isUploading}
          >
            Clear All
          </button>
        </div>
      )}

      {/* Error Display */}
      {hookError && (
        <div className="image-upload-error">
          <div className="image-upload-error-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <div className="image-upload-error-message">{hookError}</div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
