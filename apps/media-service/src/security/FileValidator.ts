import { CustomError } from '../../../shared/errors/CustomError';

export interface FileValidationResult {
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

export interface MalwareScanResult {
  isClean: boolean;
  threats: Array<{
    name: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }>;
  scanTime: number;
  engine: string;
}

export interface ContentModerationResult {
  isAppropriate: boolean;
  confidence: number;
  categories: Array<{
    name: string;
    confidence: number;
    severity: 'low' | 'medium' | 'high';
  }>;
  suggestions: string[];
  moderationTime: number;
}

export class FileValidator {
  private readonly MAX_FILE_SIZES = {
    avatar: 5 * 1024 * 1024, // 5MB
    banner: 10 * 1024 * 1024, // 10MB
    post: 20 * 1024 * 1024, // 20MB
    document: 50 * 1024 * 1024 // 50MB
  };

  private readonly ALLOWED_MIME_TYPES = {
    avatar: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif'
    ],
    banner: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif'
    ],
    post: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/avif',
      'video/mp4',
      'video/webm',
      'video/quicktime'
    ],
    document: [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]
  };

  private readonly DANGEROUS_EXTENSIONS = [
    '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
    '.php', '.asp', '.aspx', '.jsp', '.py', '.rb', '.pl', '.sh', '.ps1'
  ];

  private readonly SUSPICIOUS_PATTERNS = [
    /eval\s*\(/i,
    /document\.write/i,
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /onload\s*=/i,
    /onerror\s*=/i
  ];

  /**
   * Validate a file for upload
   */
  public async validateFile(
    file: File,
    type: 'avatar' | 'banner' | 'post' | 'document'
  ): Promise<FileValidationResult> {
    const result: FileValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      metadata: {
        size: file.size,
        mimeType: file.type,
        extension: this.getFileExtension(file.name),
        isImage: file.type.startsWith('image/'),
        isDocument: this.isDocumentType(file.type),
        isVideo: file.type.startsWith('video/'),
        isAudio: file.type.startsWith('audio/')
      }
    };

    try {
      // Basic file validation
      this.validateBasicFile(file, result);

      // Type-specific validation
      this.validateFileType(file, type, result);

      // Security validation
      await this.validateFileSecurity(file, result);

      // Content validation
      await this.validateFileContent(file, result);

      // Set overall validity
      result.isValid = result.errors.length === 0;

    } catch (error) {
      result.errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Scan file for malware
   */
  public async scanForMalware(file: File): Promise<MalwareScanResult> {
    const startTime = Date.now();
    
    try {
      // This is a placeholder implementation
      // In a real implementation, you would use a malware scanning service like:
      // - ClamAV
      // - VirusTotal API
      // - AWS GuardDuty
      // - Google Cloud Security Scanner
      // - Custom ML-based detection

      const buffer = await file.arrayBuffer();
      const fileContent = new Uint8Array(buffer);

      // Basic heuristic checks
      const threats = this.performHeuristicScan(fileContent, file.name);

      return {
        isClean: threats.length === 0,
        threats,
        scanTime: Date.now() - startTime,
        engine: 'heuristic'
      };
    } catch (error) {
      return {
        isClean: false,
        threats: [{
          name: 'Scan Error',
          type: 'error',
          severity: 'high',
          description: `Malware scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        scanTime: Date.now() - startTime,
        engine: 'heuristic'
      };
    }
  }

  /**
   * Moderate file content
   */
  public async moderateContent(file: File): Promise<ContentModerationResult> {
    const startTime = Date.now();

    try {
      // This is a placeholder implementation
      // In a real implementation, you would use a content moderation service like:
      // - AWS Rekognition
      // - Google Vision API
      // - Azure Content Moderator
      // - Custom ML model

      const categories: ContentModerationResult['categories'] = [];
      const suggestions: string[] = [];

      // Basic content checks
      if (file.type.startsWith('image/')) {
        const imageModeration = await this.moderateImageContent(file);
        categories.push(...imageModeration.categories);
        suggestions.push(...imageModeration.suggestions);
      } else if (file.type.startsWith('video/')) {
        const videoModeration = await this.moderateVideoContent(file);
        categories.push(...videoModeration.categories);
        suggestions.push(...videoModeration.suggestions);
      } else if (file.type.startsWith('text/') || file.type === 'application/pdf') {
        const textModeration = await this.moderateTextContent(file);
        categories.push(...textModeration.categories);
        suggestions.push(...textModeration.suggestions);
      }

      const isAppropriate = categories.every(cat => cat.severity === 'low');
      const confidence = categories.length > 0 
        ? categories.reduce((sum, cat) => sum + cat.confidence, 0) / categories.length 
        : 0.95;

      return {
        isAppropriate,
        confidence,
        categories,
        suggestions,
        moderationTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        isAppropriate: false,
        confidence: 0,
        categories: [{
          name: 'Moderation Error',
          confidence: 1.0,
          severity: 'high'
        }],
        suggestions: [`Content moderation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        moderationTime: Date.now() - startTime
      };
    }
  }

  /**
   * Validate file signature (magic bytes)
   */
  public async validateFileSignature(file: File): Promise<boolean> {
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer.slice(0, 16)); // Read first 16 bytes

      // Check magic bytes for common file types
      const signatures: Record<string, number[][]> = {
        'image/jpeg': [[0xFF, 0xD8, 0xFF]],
        'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
        'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
        'image/webp': [[0x52, 0x49, 0x46, 0x46], [0x57, 0x45, 0x42, 0x50]],
        'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
        'video/mp4': [[0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]]
      };

      const expectedSignature = signatures[file.type];
      if (!expectedSignature) {
        return true; // No signature check for this type
      }

      return expectedSignature.some(signature => 
        signature.every((byte, index) => bytes[index] === byte)
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Check file for embedded threats
   */
  public async checkEmbeddedThreats(file: File): Promise<{
    hasThreats: boolean;
    threats: string[];
  }> {
    try {
      const threats: string[] = [];

      if (file.type.startsWith('image/')) {
        // Check for embedded scripts in images
        const buffer = await file.arrayBuffer();
        const content = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
        
        for (const pattern of this.SUSPICIOUS_PATTERNS) {
          if (pattern.test(content)) {
            threats.push(`Suspicious pattern detected: ${pattern.source}`);
          }
        }
      }

      return {
        hasThreats: threats.length > 0,
        threats
      };
    } catch (error) {
      return {
        hasThreats: true,
        threats: [`Error checking embedded threats: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  // Private helper methods

  private validateBasicFile(file: File, result: FileValidationResult): void {
    // Check if file exists
    if (!file) {
      result.errors.push('No file provided');
      return;
    }

    // Check file name
    if (!file.name || file.name.trim().length === 0) {
      result.errors.push('File name is required');
    }

    // Check file size
    if (file.size === 0) {
      result.errors.push('File is empty');
    }

    // Check for suspicious file names
    if (this.isSuspiciousFileName(file.name)) {
      result.errors.push('File name contains suspicious characters');
    }

    // Check file extension
    const extension = this.getFileExtension(file.name);
    if (this.DANGEROUS_EXTENSIONS.includes(extension.toLowerCase())) {
      result.errors.push(`File extension ${extension} is not allowed`);
    }
  }

  private validateFileType(file: File, type: string, result: FileValidationResult): void {
    const maxSize = this.MAX_FILE_SIZES[type as keyof typeof this.MAX_FILE_SIZES];
    const allowedTypes = this.ALLOWED_MIME_TYPES[type as keyof typeof this.ALLOWED_MIME_TYPES];

    // Check file size
    if (file.size > maxSize) {
      result.errors.push(`File size exceeds maximum allowed size of ${this.formatFileSize(maxSize)}`);
    }

    // Check MIME type
    if (!allowedTypes.includes(file.type)) {
      result.errors.push(`File type ${file.type} is not allowed for ${type} uploads`);
    }

    // Type-specific validations
    if (type === 'avatar' && file.type.startsWith('image/')) {
      this.validateAvatarImage(file, result);
    } else if (type === 'banner' && file.type.startsWith('image/')) {
      this.validateBannerImage(file, result);
    }
  }

  private async validateFileSecurity(file: File, result: FileValidationResult): Promise<void> {
    // Validate file signature
    const isValidSignature = await this.validateFileSignature(file);
    if (!isValidSignature) {
      result.errors.push('File signature does not match declared MIME type');
    }

    // Check for embedded threats
    const embeddedThreats = await this.checkEmbeddedThreats(file);
    if (embeddedThreats.hasThreats) {
      result.errors.push(...embeddedThreats.threats);
    }

    // Scan for malware
    const malwareScan = await this.scanForMalware(file);
    if (!malwareScan.isClean) {
      result.errors.push(`Malware detected: ${malwareScan.threats.map(t => t.name).join(', ')}`);
    }
  }

  private async validateFileContent(file: File, result: FileValidationResult): Promise<void> {
    // Moderate content
    const moderation = await this.moderateContent(file);
    if (!moderation.isAppropriate) {
      result.errors.push(`Inappropriate content detected: ${moderation.categories.map(c => c.name).join(', ')}`);
    }

    if (moderation.suggestions.length > 0) {
      result.warnings.push(...moderation.suggestions);
    }
  }

  private validateAvatarImage(file: File, result: FileValidationResult): void {
    // Avatar-specific validations would go here
    // For example, checking aspect ratio, minimum dimensions, etc.
  }

  private validateBannerImage(file: File, result: FileValidationResult): void {
    // Banner-specific validations would go here
    // For example, checking aspect ratio, minimum dimensions, etc.
  }

  private performHeuristicScan(fileContent: Uint8Array, fileName: string): MalwareScanResult['threats'] {
    const threats: MalwareScanResult['threats'] = [];

    // Check for suspicious byte patterns
    const suspiciousPatterns = [
      { pattern: [0x4D, 0x5A], name: 'PE Executable', severity: 'high' as const },
      { pattern: [0x7F, 0x45, 0x4C, 0x46], name: 'ELF Executable', severity: 'high' as const },
      { pattern: [0xCA, 0xFE, 0xBA, 0xBE], name: 'Java Class File', severity: 'medium' as const }
    ];

    for (const { pattern, name, severity } of suspiciousPatterns) {
      if (this.containsPattern(fileContent, pattern)) {
        threats.push({
          name,
          type: 'executable',
          severity,
          description: `Suspicious executable pattern detected: ${name}`
        });
      }
    }

    // Check for script-like content
    const textContent = new TextDecoder('utf-8', { fatal: false }).decode(fileContent);
    if (textContent.includes('<script') || textContent.includes('javascript:')) {
      threats.push({
        name: 'Script Content',
        type: 'script',
        severity: 'medium',
        description: 'Script-like content detected in file'
      });
    }

    return threats;
  }

  private async moderateImageContent(file: File): Promise<{
    categories: ContentModerationResult['categories'];
    suggestions: string[];
  }> {
    // Placeholder for image content moderation
    return {
      categories: [],
      suggestions: []
    };
  }

  private async moderateVideoContent(file: File): Promise<{
    categories: ContentModerationResult['categories'];
    suggestions: string[];
  }> {
    // Placeholder for video content moderation
    return {
      categories: [],
      suggestions: []
    };
  }

  private async moderateTextContent(file: File): Promise<{
    categories: ContentModerationResult['categories'];
    suggestions: string[];
  }> {
    // Placeholder for text content moderation
    return {
      categories: [],
      suggestions: []
    };
  }

  private getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot !== -1 ? fileName.substring(lastDot) : '';
  }

  private isDocumentType(mimeType: string): boolean {
    return mimeType.startsWith('application/') || mimeType.startsWith('text/');
  }

  private isSuspiciousFileName(fileName: string): boolean {
    const suspiciousPatterns = [
      /\.\./, // Directory traversal
      /[<>:"|?*]/, // Invalid characters
      /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, // Reserved names
      /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar)$/i // Executable extensions
    ];

    return suspiciousPatterns.some(pattern => pattern.test(fileName));
  }

  private containsPattern(data: Uint8Array, pattern: number[]): boolean {
    for (let i = 0; i <= data.length - pattern.length; i++) {
      let match = true;
      for (let j = 0; j < pattern.length; j++) {
        if (data[i + j] !== pattern[j]) {
          match = false;
          break;
        }
      }
      if (match) return true;
    }
    return false;
  }

  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get validation rules for a specific file type
   */
  public getValidationRules(type: 'avatar' | 'banner' | 'post' | 'document'): {
    maxSize: number;
    allowedTypes: string[];
    allowedExtensions: string[];
    requirements: string[];
  } {
    return {
      maxSize: this.MAX_FILE_SIZES[type],
      allowedTypes: this.ALLOWED_MIME_TYPES[type],
      allowedExtensions: this.ALLOWED_MIME_TYPES[type].map(mime => {
        const ext = mime.split('/')[1];
        return ext ? `.${ext}` : '';
      }).filter(Boolean),
      requirements: this.getRequirementsForType(type)
    };
  }

  private getRequirementsForType(type: string): string[] {
    const requirements: Record<string, string[]> = {
      avatar: [
        'Must be a square image',
        'Recommended size: 256x256 pixels',
        'Supported formats: JPEG, PNG, WebP, AVIF'
      ],
      banner: [
        'Recommended aspect ratio: 16:9',
        'Recommended size: 1920x1080 pixels',
        'Supported formats: JPEG, PNG, WebP, AVIF'
      ],
      post: [
        'Maximum file size: 20MB',
        'Supported formats: Images (JPEG, PNG, GIF, WebP, AVIF), Videos (MP4, WebM, QuickTime)'
      ],
      document: [
        'Maximum file size: 50MB',
        'Supported formats: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT'
      ]
    };

    return requirements[type] || [];
  }
}
