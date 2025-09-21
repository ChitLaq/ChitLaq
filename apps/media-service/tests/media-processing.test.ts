import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MediaService } from '../src/services/MediaService';
import { ImageProcessor } from '../src/processors/ImageProcessor';
import { SupabaseStorage } from '../src/storage/SupabaseStorage';
import { FileValidator } from '../src/security/FileValidator';
import { ImageOptimizer } from '../src/utils/image-optimizer';
import { CustomError } from '../../../shared/errors/CustomError';

// Mock dependencies
jest.mock('../src/processors/ImageProcessor');
jest.mock('../src/storage/SupabaseStorage');
jest.mock('../src/security/FileValidator');
jest.mock('../src/utils/image-optimizer');

describe('Media Processing Tests', () => {
  let mediaService: MediaService;
  let mockImageProcessor: jest.Mocked<ImageProcessor>;
  let mockStorage: jest.Mocked<SupabaseStorage>;
  let mockValidator: jest.Mocked<FileValidator>;
  let mockOptimizer: jest.Mocked<ImageOptimizer>;

  beforeEach(() => {
    // Create mock instances
    mockImageProcessor = new ImageProcessor() as jest.Mocked<ImageProcessor>;
    mockStorage = new SupabaseStorage() as jest.Mocked<SupabaseStorage>;
    mockValidator = new FileValidator() as jest.Mocked<FileValidator>;
    mockOptimizer = new ImageOptimizer() as jest.Mocked<ImageOptimizer>;

    // Create media service with mocked dependencies
    mediaService = new MediaService(
      mockImageProcessor,
      mockStorage,
      mockValidator,
      mockOptimizer
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('File Upload Processing', () => {
    it('should successfully process a valid image upload', async () => {
      // Arrange
      const mockFile = new File(['test image data'], 'test.jpg', { type: 'image/jpeg' });
      const mockValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        metadata: {
          size: 1024,
          mimeType: 'image/jpeg',
          extension: '.jpg',
          isImage: true,
          isDocument: false,
          isVideo: false,
          isAudio: false
        }
      };

      const mockOptimizationResult = {
        originalSize: 1024,
        optimizedSize: 512,
        compressionRatio: 50,
        format: 'webp',
        dimensions: { width: 1920, height: 1080 },
        thumbnails: [
          {
            size: { width: 150, height: 150 },
            suffix: '_thumb',
            data: new Uint8Array([1, 2, 3]),
            fileSize: 128
          }
        ],
        metadata: {
          processingTime: 100,
          algorithm: 'sharp',
          quality: 85,
          progressive: true
        }
      };

      const mockStorageResult = {
        id: 'test-id',
        url: 'https://example.com/test.jpg',
        filename: 'test.jpg',
        size: 512,
        type: 'image/webp',
        dimensions: { width: 1920, height: 1080 },
        thumbnails: [
          {
            size: { width: 150, height: 150 },
            suffix: '_thumb',
            url: 'https://example.com/test_thumb.jpg'
          }
        ],
        metadata: {
          uploadedAt: new Date().toISOString(),
          processingTime: 100,
          compressionRatio: 50
        }
      };

      mockValidator.validateFile.mockResolvedValue(mockValidationResult);
      mockOptimizer.optimizeImage.mockResolvedValue(mockOptimizationResult);
      mockStorage.storeFile.mockResolvedValue(mockStorageResult);

      // Act
      const result = await mediaService.processUpload(mockFile, 'avatar');

      // Assert
      expect(result).toEqual(mockStorageResult);
      expect(mockValidator.validateFile).toHaveBeenCalledWith(mockFile, 'avatar');
      expect(mockOptimizer.optimizeImage).toHaveBeenCalled();
      expect(mockStorage.storeFile).toHaveBeenCalled();
    });

    it('should reject invalid file uploads', async () => {
      // Arrange
      const mockFile = new File(['test data'], 'test.exe', { type: 'application/x-executable' });
      const mockValidationResult = {
        isValid: false,
        errors: ['File type application/x-executable is not allowed for avatar uploads'],
        warnings: [],
        metadata: {
          size: 1024,
          mimeType: 'application/x-executable',
          extension: '.exe',
          isImage: false,
          isDocument: false,
          isVideo: false,
          isAudio: false
        }
      };

      mockValidator.validateFile.mockResolvedValue(mockValidationResult);

      // Act & Assert
      await expect(mediaService.processUpload(mockFile, 'avatar'))
        .rejects
        .toThrow(CustomError);

      expect(mockValidator.validateFile).toHaveBeenCalledWith(mockFile, 'avatar');
      expect(mockOptimizer.optimizeImage).not.toHaveBeenCalled();
      expect(mockStorage.storeFile).not.toHaveBeenCalled();
    });

    it('should handle file processing errors gracefully', async () => {
      // Arrange
      const mockFile = new File(['test image data'], 'test.jpg', { type: 'image/jpeg' });
      const mockValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        metadata: {
          size: 1024,
          mimeType: 'image/jpeg',
          extension: '.jpg',
          isImage: true,
          isDocument: false,
          isVideo: false,
          isAudio: false
        }
      };

      mockValidator.validateFile.mockResolvedValue(mockValidationResult);
      mockOptimizer.optimizeImage.mockRejectedValue(new Error('Optimization failed'));

      // Act & Assert
      await expect(mediaService.processUpload(mockFile, 'avatar'))
        .rejects
        .toThrow('Optimization failed');

      expect(mockValidator.validateFile).toHaveBeenCalledWith(mockFile, 'avatar');
      expect(mockOptimizer.optimizeImage).toHaveBeenCalled();
      expect(mockStorage.storeFile).not.toHaveBeenCalled();
    });
  });

  describe('Image Processing', () => {
    it('should process image with correct parameters', async () => {
      // Arrange
      const mockFile = new File(['test image data'], 'test.jpg', { type: 'image/jpeg' });
      const mockValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        metadata: {
          size: 1024,
          mimeType: 'image/jpeg',
          extension: '.jpg',
          isImage: true,
          isDocument: false,
          isVideo: false,
          isAudio: false
        }
      };

      const mockOptimizationResult = {
        originalSize: 1024,
        optimizedSize: 512,
        compressionRatio: 50,
        format: 'webp',
        dimensions: { width: 1920, height: 1080 },
        thumbnails: [],
        metadata: {
          processingTime: 100,
          algorithm: 'sharp',
          quality: 85,
          progressive: true
        }
      };

      const mockStorageResult = {
        id: 'test-id',
        url: 'https://example.com/test.jpg',
        filename: 'test.jpg',
        size: 512,
        type: 'image/webp',
        dimensions: { width: 1920, height: 1080 },
        thumbnails: [],
        metadata: {
          uploadedAt: new Date().toISOString(),
          processingTime: 100,
          compressionRatio: 50
        }
      };

      mockValidator.validateFile.mockResolvedValue(mockValidationResult);
      mockOptimizer.optimizeImage.mockResolvedValue(mockOptimizationResult);
      mockStorage.storeFile.mockResolvedValue(mockStorageResult);

      // Act
      await mediaService.processUpload(mockFile, 'avatar', {
        quality: 90,
        format: 'webp',
        generateThumbnails: true
      });

      // Assert
      expect(mockOptimizer.optimizeImage).toHaveBeenCalledWith(
        expect.any(Uint8Array),
        expect.objectContaining({
          quality: 90,
          format: 'webp',
          generateThumbnails: true
        })
      );
    });

    it('should generate thumbnails when requested', async () => {
      // Arrange
      const mockFile = new File(['test image data'], 'test.jpg', { type: 'image/jpeg' });
      const mockValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        metadata: {
          size: 1024,
          mimeType: 'image/jpeg',
          extension: '.jpg',
          isImage: true,
          isDocument: false,
          isVideo: false,
          isAudio: false
        }
      };

      const mockOptimizationResult = {
        originalSize: 1024,
        optimizedSize: 512,
        compressionRatio: 50,
        format: 'webp',
        dimensions: { width: 1920, height: 1080 },
        thumbnails: [
          {
            size: { width: 150, height: 150 },
            suffix: '_thumb',
            data: new Uint8Array([1, 2, 3]),
            fileSize: 128
          },
          {
            size: { width: 300, height: 300 },
            suffix: '_small',
            data: new Uint8Array([4, 5, 6]),
            fileSize: 256
          }
        ],
        metadata: {
          processingTime: 100,
          algorithm: 'sharp',
          quality: 85,
          progressive: true
        }
      };

      const mockStorageResult = {
        id: 'test-id',
        url: 'https://example.com/test.jpg',
        filename: 'test.jpg',
        size: 512,
        type: 'image/webp',
        dimensions: { width: 1920, height: 1080 },
        thumbnails: [
          {
            size: { width: 150, height: 150 },
            suffix: '_thumb',
            url: 'https://example.com/test_thumb.jpg'
          },
          {
            size: { width: 300, height: 300 },
            suffix: '_small',
            url: 'https://example.com/test_small.jpg'
          }
        ],
        metadata: {
          uploadedAt: new Date().toISOString(),
          processingTime: 100,
          compressionRatio: 50
        }
      };

      mockValidator.validateFile.mockResolvedValue(mockValidationResult);
      mockOptimizer.optimizeImage.mockResolvedValue(mockOptimizationResult);
      mockStorage.storeFile.mockResolvedValue(mockStorageResult);

      // Act
      const result = await mediaService.processUpload(mockFile, 'avatar', {
        generateThumbnails: true
      });

      // Assert
      expect(result.thumbnails).toHaveLength(2);
      expect(result.thumbnails![0].suffix).toBe('_thumb');
      expect(result.thumbnails![1].suffix).toBe('_small');
    });
  });

  describe('File Validation', () => {
    it('should validate file types correctly', async () => {
      // Arrange
      const mockFile = new File(['test data'], 'test.jpg', { type: 'image/jpeg' });
      const mockValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        metadata: {
          size: 1024,
          mimeType: 'image/jpeg',
          extension: '.jpg',
          isImage: true,
          isDocument: false,
          isVideo: false,
          isAudio: false
        }
      };

      mockValidator.validateFile.mockResolvedValue(mockValidationResult);

      // Act
      const result = await mediaService.validateFile(mockFile, 'avatar');

      // Assert
      expect(result).toEqual(mockValidationResult);
      expect(mockValidator.validateFile).toHaveBeenCalledWith(mockFile, 'avatar');
    });

    it('should detect malware in files', async () => {
      // Arrange
      const mockFile = new File(['malicious content'], 'test.jpg', { type: 'image/jpeg' });
      const mockMalwareScanResult = {
        isClean: false,
        threats: [
          {
            name: 'Suspicious Pattern',
            type: 'script',
            severity: 'high' as const,
            description: 'Script-like content detected in file'
          }
        ],
        scanTime: 50,
        engine: 'heuristic'
      };

      mockValidator.scanForMalware.mockResolvedValue(mockMalwareScanResult);

      // Act
      const result = await mediaService.scanForMalware(mockFile);

      // Assert
      expect(result).toEqual(mockMalwareScanResult);
      expect(mockValidator.scanForMalware).toHaveBeenCalledWith(mockFile);
    });

    it('should moderate content appropriately', async () => {
      // Arrange
      const mockFile = new File(['inappropriate content'], 'test.jpg', { type: 'image/jpeg' });
      const mockModerationResult = {
        isAppropriate: false,
        confidence: 0.95,
        categories: [
          {
            name: 'Inappropriate Content',
            confidence: 0.95,
            severity: 'high' as const
          }
        ],
        suggestions: ['Content may violate community guidelines'],
        moderationTime: 100
      };

      mockValidator.moderateContent.mockResolvedValue(mockModerationResult);

      // Act
      const result = await mediaService.moderateContent(mockFile);

      // Assert
      expect(result).toEqual(mockModerationResult);
      expect(mockValidator.moderateContent).toHaveBeenCalledWith(mockFile);
    });
  });

  describe('Storage Operations', () => {
    it('should store files with correct metadata', async () => {
      // Arrange
      const mockFile = new File(['test data'], 'test.jpg', { type: 'image/jpeg' });
      const mockStorageResult = {
        id: 'test-id',
        url: 'https://example.com/test.jpg',
        filename: 'test.jpg',
        size: 1024,
        type: 'image/jpeg',
        dimensions: { width: 1920, height: 1080 },
        thumbnails: [],
        metadata: {
          uploadedAt: new Date().toISOString(),
          processingTime: 100,
          compressionRatio: 0
        }
      };

      mockStorage.storeFile.mockResolvedValue(mockStorageResult);

      // Act
      const result = await mediaService.storeFile(mockFile, 'avatar');

      // Assert
      expect(result).toEqual(mockStorageResult);
      expect(mockStorage.storeFile).toHaveBeenCalledWith(mockFile, 'avatar');
    });

    it('should retrieve files by ID', async () => {
      // Arrange
      const mockFileData = {
        id: 'test-id',
        url: 'https://example.com/test.jpg',
        filename: 'test.jpg',
        size: 1024,
        type: 'image/jpeg',
        dimensions: { width: 1920, height: 1080 },
        thumbnails: [],
        metadata: {
          uploadedAt: new Date().toISOString(),
          processingTime: 100,
          compressionRatio: 0
        }
      };

      mockStorage.getFile.mockResolvedValue(mockFileData);

      // Act
      const result = await mediaService.getFile('test-id');

      // Assert
      expect(result).toEqual(mockFileData);
      expect(mockStorage.getFile).toHaveBeenCalledWith('test-id');
    });

    it('should delete files correctly', async () => {
      // Arrange
      mockStorage.deleteFile.mockResolvedValue(true);

      // Act
      const result = await mediaService.deleteFile('test-id');

      // Assert
      expect(result).toBe(true);
      expect(mockStorage.deleteFile).toHaveBeenCalledWith('test-id');
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors', async () => {
      // Arrange
      const mockFile = new File(['test data'], 'test.exe', { type: 'application/x-executable' });
      const mockValidationResult = {
        isValid: false,
        errors: ['File type not allowed'],
        warnings: [],
        metadata: {
          size: 1024,
          mimeType: 'application/x-executable',
          extension: '.exe',
          isImage: false,
          isDocument: false,
          isVideo: false,
          isAudio: false
        }
      };

      mockValidator.validateFile.mockResolvedValue(mockValidationResult);

      // Act & Assert
      await expect(mediaService.processUpload(mockFile, 'avatar'))
        .rejects
        .toThrow(CustomError);
    });

    it('should handle storage errors', async () => {
      // Arrange
      const mockFile = new File(['test data'], 'test.jpg', { type: 'image/jpeg' });
      const mockValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        metadata: {
          size: 1024,
          mimeType: 'image/jpeg',
          extension: '.jpg',
          isImage: true,
          isDocument: false,
          isVideo: false,
          isAudio: false
        }
      };

      mockValidator.validateFile.mockResolvedValue(mockValidationResult);
      mockStorage.storeFile.mockRejectedValue(new Error('Storage error'));

      // Act & Assert
      await expect(mediaService.processUpload(mockFile, 'avatar'))
        .rejects
        .toThrow('Storage error');
    });

    it('should handle optimization errors', async () => {
      // Arrange
      const mockFile = new File(['test data'], 'test.jpg', { type: 'image/jpeg' });
      const mockValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        metadata: {
          size: 1024,
          mimeType: 'image/jpeg',
          extension: '.jpg',
          isImage: true,
          isDocument: false,
          isVideo: false,
          isAudio: false
        }
      };

      mockValidator.validateFile.mockResolvedValue(mockValidationResult);
      mockOptimizer.optimizeImage.mockRejectedValue(new Error('Optimization error'));

      // Act & Assert
      await expect(mediaService.processUpload(mockFile, 'avatar'))
        .rejects
        .toThrow('Optimization error');
    });
  });

  describe('Performance Tests', () => {
    it('should process files within acceptable time limits', async () => {
      // Arrange
      const mockFile = new File(['test data'], 'test.jpg', { type: 'image/jpeg' });
      const mockValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        metadata: {
          size: 1024,
          mimeType: 'image/jpeg',
          extension: '.jpg',
          isImage: true,
          isDocument: false,
          isVideo: false,
          isAudio: false
        }
      };

      const mockOptimizationResult = {
        originalSize: 1024,
        optimizedSize: 512,
        compressionRatio: 50,
        format: 'webp',
        dimensions: { width: 1920, height: 1080 },
        thumbnails: [],
        metadata: {
          processingTime: 100,
          algorithm: 'sharp',
          quality: 85,
          progressive: true
        }
      };

      const mockStorageResult = {
        id: 'test-id',
        url: 'https://example.com/test.jpg',
        filename: 'test.jpg',
        size: 512,
        type: 'image/webp',
        dimensions: { width: 1920, height: 1080 },
        thumbnails: [],
        metadata: {
          uploadedAt: new Date().toISOString(),
          processingTime: 100,
          compressionRatio: 50
        }
      };

      mockValidator.validateFile.mockResolvedValue(mockValidationResult);
      mockOptimizer.optimizeImage.mockResolvedValue(mockOptimizationResult);
      mockStorage.storeFile.mockResolvedValue(mockStorageResult);

      // Act
      const startTime = Date.now();
      await mediaService.processUpload(mockFile, 'avatar');
      const endTime = Date.now();

      // Assert
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle concurrent uploads', async () => {
      // Arrange
      const mockFiles = Array.from({ length: 5 }, (_, i) => 
        new File(['test data'], `test${i}.jpg`, { type: 'image/jpeg' })
      );

      const mockValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        metadata: {
          size: 1024,
          mimeType: 'image/jpeg',
          extension: '.jpg',
          isImage: true,
          isDocument: false,
          isVideo: false,
          isAudio: false
        }
      };

      const mockOptimizationResult = {
        originalSize: 1024,
        optimizedSize: 512,
        compressionRatio: 50,
        format: 'webp',
        dimensions: { width: 1920, height: 1080 },
        thumbnails: [],
        metadata: {
          processingTime: 100,
          algorithm: 'sharp',
          quality: 85,
          progressive: true
        }
      };

      const mockStorageResult = {
        id: 'test-id',
        url: 'https://example.com/test.jpg',
        filename: 'test.jpg',
        size: 512,
        type: 'image/webp',
        dimensions: { width: 1920, height: 1080 },
        thumbnails: [],
        metadata: {
          uploadedAt: new Date().toISOString(),
          processingTime: 100,
          compressionRatio: 50
        }
      };

      mockValidator.validateFile.mockResolvedValue(mockValidationResult);
      mockOptimizer.optimizeImage.mockResolvedValue(mockOptimizationResult);
      mockStorage.storeFile.mockResolvedValue(mockStorageResult);

      // Act
      const startTime = Date.now();
      const results = await Promise.all(
        mockFiles.map(file => mediaService.processUpload(file, 'avatar'))
      );
      const endTime = Date.now();

      // Assert
      expect(results).toHaveLength(5);
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });
});
