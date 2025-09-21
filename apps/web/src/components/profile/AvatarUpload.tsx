import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useImageUpload } from '../../hooks/use-image-upload';
import './AvatarUpload.css';

export interface AvatarUploadProps {
  type: 'avatar' | 'banner';
  onUploadComplete: (file: File) => void;
  onUploadError: (error: string) => void;
  currentAvatar?: string;
  cropEnabled?: boolean;
  aspectRatio?: number;
  showPreview?: boolean;
  disabled?: boolean;
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({
  type,
  onUploadComplete,
  onUploadError,
  currentAvatar,
  cropEnabled = true,
  aspectRatio = 1,
  showPreview = true,
  disabled = false,
  className = '',
  size = 'medium'
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);

  const {
    uploadImage,
    validateFile,
    isUploading: hookIsUploading,
    error: hookError
  } = useImageUpload();

  // Update upload state from hook
  useEffect(() => {
    setIsUploading(hookIsUploading);
    if (hookError) {
      setError(hookError);
      onUploadError(hookError);
    }
  }, [hookIsUploading, hookError, onUploadError]);

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    try {
      setError(null);
      
      // Validate file
      const validation = await validateFile(file, type);
      if (!validation.isValid) {
        const errorMessage = validation.errors.join(', ');
        setError(errorMessage);
        onUploadError(errorMessage);
        return;
      }

      setSelectedFile(file);
      
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      // If cropping is enabled, show crop modal
      if (cropEnabled) {
        setShowCropModal(true);
      } else {
        // Upload directly
        await handleUpload(file);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'File selection failed';
      setError(errorMessage);
      onUploadError(errorMessage);
    }
  }, [validateFile, type, cropEnabled, onUploadError]);

  // Handle file input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [disabled, handleFileSelect]);

  // Handle upload
  const handleUpload = useCallback(async (file: File) => {
    try {
      setIsUploading(true);
      setError(null);

      const result = await uploadImage(file, type, {
        quality: 90,
        format: 'webp',
        generateThumbnails: true,
        cropEnabled: cropEnabled,
        aspectRatio: aspectRatio
      });

      onUploadComplete(file);
      setShowCropModal(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setError(errorMessage);
      onUploadError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  }, [uploadImage, type, cropEnabled, aspectRatio, onUploadComplete, onUploadError]);

  // Handle crop
  const handleCrop = useCallback(async () => {
    if (!selectedFile || !canvasRef.current || !imageRef.current) return;

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const image = imageRef.current;

      if (!ctx) return;

      // Set canvas size to crop area
      canvas.width = cropArea.width;
      canvas.height = cropArea.height;

      // Draw cropped image
      ctx.drawImage(
        image,
        cropArea.x,
        cropArea.y,
        cropArea.width,
        cropArea.height,
        0,
        0,
        cropArea.width,
        cropArea.height
      );

      // Convert canvas to blob
      canvas.toBlob(async (blob) => {
        if (blob) {
          const croppedFile = new File([blob], selectedFile.name, {
            type: blob.type,
            lastModified: Date.now()
          });
          await handleUpload(croppedFile);
        }
      }, 'image/webp', 0.9);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Crop failed';
      setError(errorMessage);
      onUploadError(errorMessage);
    }
  }, [selectedFile, cropArea, handleUpload, onUploadError]);

  // Handle image load for cropping
  const handleImageLoad = useCallback(() => {
    if (!imageRef.current) return;

    const image = imageRef.current;
    const containerWidth = 400;
    const containerHeight = 400;

    // Calculate initial crop area (center square)
    const imageAspectRatio = image.naturalWidth / image.naturalHeight;
    let cropWidth, cropHeight;

    if (imageAspectRatio > aspectRatio) {
      cropHeight = Math.min(containerHeight, image.naturalHeight);
      cropWidth = cropHeight * aspectRatio;
    } else {
      cropWidth = Math.min(containerWidth, image.naturalWidth);
      cropHeight = cropWidth / aspectRatio;
    }

    const x = (image.naturalWidth - cropWidth) / 2;
    const y = (image.naturalHeight - cropHeight) / 2;

    setCropArea({ x, y, width: cropWidth, height: cropHeight });
  }, [aspectRatio]);

  // Handle crop area change
  const handleCropAreaChange = useCallback((newCropArea: CropArea) => {
    setCropArea(newCropArea);
  }, []);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setError(null);
    setShowCropModal(false);
  }, [previewUrl]);

  // Get size classes
  const getSizeClasses = useCallback(() => {
    const sizeMap = {
      small: 'avatar-upload--small',
      medium: 'avatar-upload--medium',
      large: 'avatar-upload--large'
    };
    return sizeMap[size];
  }, [size]);

  // Get current avatar URL
  const getCurrentAvatarUrl = useCallback(() => {
    return previewUrl || currentAvatar || '/default-avatar.png';
  }, [previewUrl, currentAvatar]);

  return (
    <div className={`avatar-upload ${getSizeClasses()} ${className}`}>
      {/* Upload Area */}
      <div
        className={`avatar-upload__area ${isDragging ? 'avatar-upload__area--dragging' : ''} ${disabled ? 'avatar-upload__area--disabled' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          style={{ display: 'none' }}
          disabled={disabled}
        />

        {/* Preview */}
        {showPreview && (
          <div className="avatar-upload__preview">
            <img
              src={getCurrentAvatarUrl()}
              alt="Avatar preview"
              className="avatar-upload__preview-image"
            />
            
            {/* Upload Overlay */}
            {!disabled && (
              <div className="avatar-upload__overlay">
                <div className="avatar-upload__overlay-content">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5" />
                    <path d="M17 8l-5-5-5 5" />
                    <path d="M12 3v12" />
                  </svg>
                  <span className="avatar-upload__overlay-text">
                    {type === 'avatar' ? 'Change Avatar' : 'Change Banner'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upload Icon */}
        {!showPreview && (
          <div className="avatar-upload__icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5" />
              <path d="M17 8l-5-5-5 5" />
              <path d="M12 3v12" />
            </svg>
          </div>
        )}

        {/* Loading State */}
        {isUploading && (
          <div className="avatar-upload__loading">
            <div className="avatar-upload__spinner">
              <svg width="24" height="24" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" fill="none" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="avatar-upload__error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Instructions */}
      {!disabled && (
        <div className="avatar-upload__instructions">
          <p>Click to upload or drag and drop</p>
          <p className="avatar-upload__instructions--small">
            {type === 'avatar' ? 'PNG, JPG, WebP up to 5MB' : 'PNG, JPG, WebP up to 10MB'}
          </p>
        </div>
      )}

      {/* Crop Modal */}
      {showCropModal && selectedFile && previewUrl && (
        <div className="avatar-upload__crop-modal">
          <div className="avatar-upload__crop-modal-content">
            <div className="avatar-upload__crop-header">
              <h3>Crop {type === 'avatar' ? 'Avatar' : 'Banner'}</h3>
              <button
                className="avatar-upload__crop-close"
                onClick={clearSelection}
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="avatar-upload__crop-container">
              <div className="avatar-upload__crop-image-container">
                <img
                  ref={imageRef}
                  src={previewUrl}
                  alt="Crop preview"
                  className="avatar-upload__crop-image"
                  onLoad={handleImageLoad}
                />
                
                {/* Crop Overlay */}
                <div
                  className="avatar-upload__crop-overlay"
                  style={{
                    left: cropArea.x,
                    top: cropArea.y,
                    width: cropArea.width,
                    height: cropArea.height
                  }}
                />
              </div>
            </div>

            <div className="avatar-upload__crop-actions">
              <button
                type="button"
                className="avatar-upload__crop-button avatar-upload__crop-button--secondary"
                onClick={clearSelection}
              >
                Cancel
              </button>
              
              <button
                type="button"
                className="avatar-upload__crop-button avatar-upload__crop-button--primary"
                onClick={handleCrop}
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Crop & Upload'}
              </button>
            </div>

            {/* Hidden canvas for cropping */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default AvatarUpload;
