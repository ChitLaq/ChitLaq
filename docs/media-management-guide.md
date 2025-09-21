# Media Management System Guide

## Overview

The ChitLaq Media Management System provides comprehensive media handling capabilities for user profiles, including avatar uploads, image processing, storage optimization, and CDN integration. This system is designed to handle high-volume media processing while maintaining security, performance, and cost efficiency.

## Architecture

### Core Components

1. **MediaService** - Central orchestration service
2. **ImageProcessor** - Image processing and optimization
3. **SupabaseStorage** - File storage and retrieval
4. **FileValidator** - Security and validation
5. **ImageOptimizer** - Format conversion and compression

### Data Flow

```
User Upload → Validation → Processing → Optimization → Storage → CDN
     ↓              ↓           ↓            ↓           ↓        ↓
  Security      Malware      Format      Compression   Supabase  CloudFlare
  Checks        Scanning     Conversion   Quality      Storage   CDN
```

## Features

### 1. File Upload & Validation

#### Supported File Types
- **Avatars**: JPEG, PNG, WebP, AVIF (max 5MB)
- **Banners**: JPEG, PNG, WebP, AVIF (max 10MB)
- **Posts**: Images (JPEG, PNG, GIF, WebP, AVIF), Videos (MP4, WebM, QuickTime) (max 20MB)
- **Documents**: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT (max 50MB)

#### Validation Features
- File type verification
- Size limit enforcement
- Malware scanning
- Content moderation
- File signature validation
- Suspicious pattern detection

### 2. Image Processing

#### Automatic Format Conversion
- **Modern formats**: AVIF, WebP for better compression
- **Fallback formats**: JPEG, PNG for compatibility
- **Quality optimization**: Automatic quality adjustment based on content

#### Thumbnail Generation
- Multiple sizes: 64x64, 128x128, 256x256, 512x512
- Aspect ratio preservation
- Progressive loading support

#### Image Optimization
- **Compression**: 60-95% size reduction
- **Progressive JPEG**: Faster loading
- **Metadata stripping**: Privacy and size optimization
- **Color space optimization**: sRGB conversion

### 3. Storage Management

#### Hierarchical Structure
```
media/
├── avatars/
│   ├── 2024/
│   │   ├── 01/
│   │   │   ├── user_123_avatar.webp
│   │   │   └── user_123_avatar_thumb.webp
│   │   └── 02/
├── banners/
│   ├── 2024/
│   │   ├── 01/
│   │   └── 02/
├── posts/
│   ├── 2024/
│   │   ├── 01/
│   │   └── 02/
└── documents/
    ├── 2024/
    │   ├── 01/
    │   └── 02/
```

#### File Naming Convention
- **Format**: `{type}_{user_id}_{timestamp}_{hash}.{extension}`
- **Example**: `avatar_123_20240115_abc123.webp`
- **Thumbnails**: `{filename}_{size}.{extension}`
- **Example**: `avatar_123_20240115_abc123_thumb.webp`

### 4. Security Features

#### Malware Detection
- Heuristic scanning
- Pattern recognition
- Executable detection
- Script content analysis

#### Content Moderation
- Inappropriate content detection
- NSFW filtering
- Spam prevention
- Community guidelines enforcement

#### Access Control
- Row Level Security (RLS)
- User-based permissions
- Privacy controls
- Audit logging

## API Reference

### Upload Endpoint

```http
POST /api/media/upload
Content-Type: multipart/form-data

Parameters:
- file: File (required)
- type: string (required) - 'avatar', 'banner', 'post', 'document'
- quality: number (optional) - 60-95, default 85
- format: string (optional) - 'jpeg', 'png', 'webp', 'avif'
- generateThumbnails: boolean (optional) - default true
- cropEnabled: boolean (optional) - default false
- aspectRatio: number (optional) - for cropping
```

### Response Format

```json
{
  "id": "uuid",
  "url": "https://cdn.example.com/media/avatar_123_20240115_abc123.webp",
  "filename": "avatar_123_20240115_abc123.webp",
  "size": 51200,
  "type": "image/webp",
  "dimensions": {
    "width": 256,
    "height": 256
  },
  "thumbnails": [
    {
      "size": { "width": 64, "height": 64 },
      "suffix": "_thumb",
      "url": "https://cdn.example.com/media/avatar_123_20240115_abc123_thumb.webp"
    }
  ],
  "metadata": {
    "uploadedAt": "2024-01-15T10:30:00Z",
    "processingTime": 150,
    "compressionRatio": 75
  }
}
```

### Get File Endpoint

```http
GET /api/media/{fileId}
```

### Delete File Endpoint

```http
DELETE /api/media/{fileId}
```

## Frontend Integration

### React Component Usage

```tsx
import ImageUpload from '@/components/ImageUpload';

function ProfileSetup() {
  const handleUploadComplete = (result) => {
    console.log('Upload completed:', result);
    // Update user profile with new avatar
  };

  const handleUploadError = (error) => {
    console.error('Upload failed:', error);
    // Show error message to user
  };

  return (
    <ImageUpload
      type="avatar"
      onUploadComplete={handleUploadComplete}
      onUploadError={handleUploadError}
      showPreview={true}
      showProgress={true}
      autoUpload={true}
      cropEnabled={true}
      aspectRatio={1}
    />
  );
}
```

### Hook Usage

```tsx
import { useImageUpload } from '@/hooks/use-image-upload';

function MyComponent() {
  const {
    uploadImage,
    validateFile,
    isUploading,
    error,
    uploadStats
  } = useImageUpload();

  const handleFileSelect = async (file) => {
    try {
      const result = await uploadImage(file, 'avatar', {
        quality: 90,
        format: 'webp',
        generateThumbnails: true
      });
      console.log('Upload successful:', result);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  return (
    <div>
      <input type="file" onChange={(e) => handleFileSelect(e.target.files[0])} />
      {isUploading && <div>Uploading...</div>}
      {error && <div>Error: {error}</div>}
    </div>
  );
}
```

## Configuration

### Environment Variables

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_STORAGE_BUCKET=media
SUPABASE_TEMP_BUCKET=temp

# Image Processing
IMAGE_QUALITY_DEFAULT=85
IMAGE_FORMAT_DEFAULT=webp
THUMBNAIL_SIZES=64,128,256,512
MAX_FILE_SIZE_AVATAR=5242880
MAX_FILE_SIZE_BANNER=10485760
MAX_FILE_SIZE_POST=20971520
MAX_FILE_SIZE_DOCUMENT=52428800

# Security
ENABLE_MALWARE_SCANNING=true
ENABLE_CONTENT_MODERATION=true
ENABLE_FILE_SIGNATURE_VALIDATION=true

# CDN Configuration
CDN_URL=https://cdn.example.com
CDN_CACHE_TTL=31536000
```

### Database Schema

```sql
-- Media files table
CREATE TABLE media_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  path VARCHAR(500) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size BIGINT NOT NULL,
  file_hash VARCHAR(64),
  dimensions JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Storage statistics table
CREATE TABLE storage_stats (
  id VARCHAR(50) PRIMARY KEY,
  total_files INTEGER NOT NULL DEFAULT 0,
  total_size BIGINT NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- File access logs table
CREATE TABLE file_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES media_files(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Performance Optimization

### Caching Strategy

1. **CDN Caching**: 1 year TTL for static assets
2. **Browser Caching**: ETags and Last-Modified headers
3. **Redis Caching**: Metadata and thumbnails
4. **Database Caching**: Query result caching

### Compression

1. **Image Compression**: 60-95% size reduction
2. **Format Optimization**: Modern formats (WebP, AVIF)
3. **Progressive Loading**: JPEG progressive encoding
4. **Lazy Loading**: On-demand thumbnail generation

### CDN Integration

1. **CloudFlare**: Global content delivery
2. **Image Optimization**: Automatic format conversion
3. **Caching**: Aggressive caching for static assets
4. **Compression**: Gzip/Brotli compression

## Security Best Practices

### File Validation

1. **Type Validation**: MIME type and file signature
2. **Size Limits**: Enforce maximum file sizes
3. **Content Scanning**: Malware and virus detection
4. **Pattern Detection**: Suspicious content patterns

### Access Control

1. **Authentication**: JWT-based authentication
2. **Authorization**: Role-based access control
3. **Privacy Controls**: User-configurable privacy settings
4. **Audit Logging**: Complete access audit trail

### Data Protection

1. **Encryption**: At-rest and in-transit encryption
2. **Backup**: Regular automated backups
3. **Retention**: Configurable data retention policies
4. **Compliance**: GDPR, CCPA, FERPA compliance

## Monitoring & Maintenance

### Health Checks

```bash
# Check media service health
curl -f http://localhost:3000/api/media/health

# Check storage connectivity
curl -f http://localhost:3000/api/media/storage/health

# Check processing queue
curl -f http://localhost:3000/api/media/queue/health
```

### Cleanup Scripts

```bash
# Run media cleanup
npm run media:cleanup

# Clean orphaned files
npm run media:cleanup -- --orphaned-files

# Clean temporary files
npm run media:cleanup -- --temp-files

# Clean expired files
npm run media:cleanup -- --expired-files
```

### Monitoring Metrics

1. **Upload Success Rate**: Percentage of successful uploads
2. **Processing Time**: Average processing time per file
3. **Storage Usage**: Total storage consumption
4. **Error Rate**: Failed uploads and processing errors
5. **CDN Hit Rate**: Cache hit ratio

## Troubleshooting

### Common Issues

#### Upload Failures

**Problem**: File upload fails with validation error
**Solution**: Check file type, size, and format requirements

**Problem**: Upload timeout
**Solution**: Increase timeout limits or optimize file size

#### Processing Errors

**Problem**: Image processing fails
**Solution**: Check image format support and processing limits

**Problem**: Thumbnail generation fails
**Solution**: Verify image dimensions and processing parameters

#### Storage Issues

**Problem**: Storage quota exceeded
**Solution**: Run cleanup scripts or increase storage limits

**Problem**: File not found
**Solution**: Check file path and storage bucket configuration

### Debug Mode

```bash
# Enable debug logging
DEBUG=media:* npm start

# Enable verbose processing logs
LOG_LEVEL=debug npm start
```

### Performance Tuning

1. **Image Processing**: Adjust quality and format settings
2. **Thumbnail Sizes**: Optimize thumbnail dimensions
3. **Caching**: Tune cache TTL and invalidation
4. **CDN**: Optimize CDN configuration

## Migration Guide

### From Legacy System

1. **Data Migration**: Export existing media files
2. **Format Conversion**: Convert to modern formats
3. **Path Updates**: Update file paths and URLs
4. **Database Migration**: Migrate metadata and relationships

### Version Upgrades

1. **Backup**: Create full system backup
2. **Schema Updates**: Run database migrations
3. **Configuration**: Update environment variables
4. **Testing**: Verify all functionality

## Cost Optimization

### Storage Costs

1. **Format Optimization**: Use efficient formats (WebP, AVIF)
2. **Compression**: Maximize compression ratios
3. **Cleanup**: Regular orphaned file cleanup
4. **Lifecycle**: Implement data lifecycle policies

### CDN Costs

1. **Caching**: Maximize cache hit ratios
2. **Compression**: Enable compression
3. **Optimization**: Use CDN image optimization
4. **Monitoring**: Track bandwidth usage

### Processing Costs

1. **Batch Processing**: Process multiple files together
2. **Queue Management**: Optimize processing queues
3. **Resource Limits**: Set appropriate resource limits
4. **Monitoring**: Track processing costs

## Future Enhancements

### Planned Features

1. **AI-Powered Moderation**: Machine learning content moderation
2. **Advanced Analytics**: Detailed usage analytics
3. **Multi-CDN Support**: Multiple CDN providers
4. **Real-time Processing**: WebSocket-based processing updates
5. **Advanced Cropping**: Smart cropping and composition

### Scalability Improvements

1. **Microservices**: Split into smaller services
2. **Queue System**: Implement message queues
3. **Load Balancing**: Distribute processing load
4. **Auto-scaling**: Dynamic resource allocation

## Support

### Documentation

- [API Reference](./api-reference.md)
- [Configuration Guide](./configuration.md)
- [Security Guide](./security.md)
- [Performance Guide](./performance.md)

### Community

- [GitHub Issues](https://github.com/chitlaq/media-service/issues)
- [Discord Community](https://discord.gg/chitlaq)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/chitlaq)

### Professional Support

- [Enterprise Support](https://chitlaq.com/enterprise)
- [Consulting Services](https://chitlaq.com/consulting)
- [Training Programs](https://chitlaq.com/training)
