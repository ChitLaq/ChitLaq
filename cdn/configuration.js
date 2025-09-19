// cdn/configuration.js
// ChitLaq M1 MVP - CDN Configuration and Optimization
// Senior Performance Engineer - 15+ years CDN and content delivery experience

/**
 * CDN Configuration for ChitLaq M1 MVP
 * 
 * This module provides comprehensive CDN configuration and optimization
 * strategies for the ChitLaq social media platform.
 * 
 * Features:
 * - Multi-CDN strategy implementation
 * - Image optimization and transformation
 * - Caching strategies and invalidation
 * - Performance monitoring and analytics
 * - Cost optimization and fallback mechanisms
 */

const crypto = require('crypto');
const sharp = require('sharp');
const AWS = require('aws-sdk');
const { createHash } = require('crypto');

class CDNConfiguration {
  constructor(config = {}) {
    this.config = {
      // Primary CDN configuration
      primary: {
        provider: config.primary?.provider || 'cloudflare',
        zoneId: config.primary?.zoneId || process.env.CLOUDFLARE_ZONE_ID,
        apiToken: config.primary?.apiToken || process.env.CLOUDFLARE_API_TOKEN,
        domain: config.primary?.domain || process.env.CDN_DOMAIN,
        ...config.primary
      },
      
      // Secondary CDN configuration (fallback)
      secondary: {
        provider: config.secondary?.provider || 'aws-cloudfront',
        distributionId: config.secondary?.distributionId || process.env.CLOUDFRONT_DISTRIBUTION_ID,
        accessKeyId: config.secondary?.accessKeyId || process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.secondary?.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY,
        region: config.secondary?.region || process.env.AWS_REGION || 'us-east-1',
        ...config.secondary
      },
      
      // Image optimization settings
      imageOptimization: {
        enabled: true,
        formats: ['webp', 'avif', 'jpeg', 'png'],
        qualities: {
          webp: 80,
          avif: 70,
          jpeg: 85,
          png: 90
        },
        sizes: [
          { name: 'thumbnail', width: 150, height: 150 },
          { name: 'small', width: 300, height: 300 },
          { name: 'medium', width: 600, height: 600 },
          { name: 'large', width: 1200, height: 1200 },
          { name: 'original', width: null, height: null }
        ],
        ...config.imageOptimization
      },
      
      // Caching configuration
      caching: {
        defaultTTL: 31536000, // 1 year
        browserTTL: 86400,    // 1 day
        edgeTTL: 604800,      // 1 week
        ...config.caching
      },
      
      // Security settings
      security: {
        allowedOrigins: config.security?.allowedOrigins || ['*'],
        corsEnabled: true,
        hotlinkProtection: true,
        ...config.security
      }
    };

    this.initializeProviders();
  }

  /**
   * Initialize CDN providers
   */
  initializeProviders() {
    // Initialize Cloudflare
    if (this.config.primary.provider === 'cloudflare') {
      this.cloudflare = new CloudflareProvider(this.config.primary);
    }

    // Initialize AWS CloudFront
    if (this.config.secondary.provider === 'aws-cloudfront') {
      this.cloudfront = new AWSCloudFrontProvider(this.config.secondary);
    }
  }

  /**
   * Upload and optimize image
   */
  async uploadImage(file, options = {}) {
    const {
      userId,
      type = 'post',
      sizes = ['thumbnail', 'small', 'medium', 'large'],
      formats = ['webp', 'jpeg'],
      quality = 80
    } = options;

    try {
      const results = {};
      const baseKey = this.generateImageKey(userId, type, file.originalname);

      // Process each size and format
      for (const size of sizes) {
        const sizeConfig = this.config.imageOptimization.sizes.find(s => s.name === size);
        if (!sizeConfig) continue;

        for (const format of formats) {
          const optimizedImage = await this.optimizeImage(file, {
            width: sizeConfig.width,
            height: sizeConfig.height,
            format,
            quality: this.config.imageOptimization.qualities[format] || quality
          });

          const key = `${baseKey}_${size}.${format}`;
          const url = await this.uploadToCDN(optimizedImage, key);

          if (!results[size]) results[size] = {};
          results[size][format] = url;
        }
      }

      return results;
    } catch (error) {
      console.error('Image upload error:', error);
      throw error;
    }
  }

  /**
   * Optimize image using Sharp
   */
  async optimizeImage(file, options = {}) {
    const {
      width,
      height,
      format = 'jpeg',
      quality = 80,
      progressive = true
    } = options;

    let pipeline = sharp(file.buffer);

    // Resize if dimensions specified
    if (width || height) {
      pipeline = pipeline.resize(width, height, {
        fit: 'cover',
        position: 'center',
        withoutEnlargement: true
      });
    }

    // Apply format-specific optimizations
    switch (format) {
      case 'webp':
        pipeline = pipeline.webp({ quality, progressive });
        break;
      case 'avif':
        pipeline = pipeline.avif({ quality, progressive });
        break;
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality, progressive, mozjpeg: true });
        break;
      case 'png':
        pipeline = pipeline.png({ quality, progressive, compressionLevel: 9 });
        break;
    }

    return await pipeline.toBuffer();
  }

  /**
   * Upload to CDN with fallback
   */
  async uploadToCDN(buffer, key) {
    try {
      // Try primary CDN first
      if (this.cloudflare) {
        return await this.cloudflare.upload(buffer, key);
      }
    } catch (error) {
      console.warn('Primary CDN upload failed, trying secondary:', error);
    }

    try {
      // Fallback to secondary CDN
      if (this.cloudfront) {
        return await this.cloudfront.upload(buffer, key);
      }
    } catch (error) {
      console.error('Secondary CDN upload failed:', error);
      throw error;
    }

    throw new Error('No CDN provider available');
  }

  /**
   * Generate image key for CDN
   */
  generateImageKey(userId, type, filename) {
    const timestamp = Date.now();
    const hash = createHash('md5').update(filename + timestamp).digest('hex').substring(0, 8);
    return `images/${userId}/${type}/${timestamp}_${hash}`;
  }

  /**
   * Invalidate CDN cache
   */
  async invalidateCache(keys) {
    const results = {};

    try {
      if (this.cloudflare) {
        results.primary = await this.cloudflare.invalidate(keys);
      }
    } catch (error) {
      console.error('Primary CDN invalidation failed:', error);
    }

    try {
      if (this.cloudfront) {
        results.secondary = await this.cloudfront.invalidate(keys);
      }
    } catch (error) {
      console.error('Secondary CDN invalidation failed:', error);
    }

    return results;
  }

  /**
   * Get CDN statistics
   */
  async getStatistics(startDate, endDate) {
    const stats = {};

    try {
      if (this.cloudflare) {
        stats.primary = await this.cloudflare.getStatistics(startDate, endDate);
      }
    } catch (error) {
      console.error('Failed to get primary CDN stats:', error);
    }

    try {
      if (this.cloudfront) {
        stats.secondary = await this.cloudfront.getStatistics(startDate, endDate);
      }
    } catch (error) {
      console.error('Failed to get secondary CDN stats:', error);
    }

    return stats;
  }
}

/**
 * Cloudflare CDN Provider
 */
class CloudflareProvider {
  constructor(config) {
    this.config = config;
    this.api = new CloudflareAPI(config.apiToken);
  }

  async upload(buffer, key) {
    const response = await this.api.uploadFile(buffer, key, {
      zoneId: this.config.zoneId,
      ttl: this.config.caching?.defaultTTL || 31536000
    });

    return `https://${this.config.domain}/${key}`;
  }

  async invalidate(keys) {
    return await this.api.purgeCache(keys, {
      zoneId: this.config.zoneId
    });
  }

  async getStatistics(startDate, endDate) {
    return await this.api.getAnalytics({
      zoneId: this.config.zoneId,
      startDate,
      endDate
    });
  }
}

/**
 * AWS CloudFront CDN Provider
 */
class AWSCloudFrontProvider {
  constructor(config) {
    this.config = config;
    this.s3 = new AWS.S3({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region
    });
    this.cloudfront = new AWS.CloudFront({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region
    });
  }

  async upload(buffer, key) {
    const params = {
      Bucket: this.config.bucket,
      Key: key,
      Body: buffer,
      ContentType: this.getContentType(key),
      CacheControl: `max-age=${this.config.caching?.defaultTTL || 31536000}`,
      ACL: 'public-read'
    };

    await this.s3.upload(params).promise();
    return `https://${this.config.domain}/${key}`;
  }

  async invalidate(keys) {
    const params = {
      DistributionId: this.config.distributionId,
      InvalidationBatch: {
        Paths: {
          Quantity: keys.length,
          Items: keys
        },
        CallerReference: Date.now().toString()
      }
    };

    return await this.cloudfront.createInvalidation(params).promise();
  }

  async getStatistics(startDate, endDate) {
    // CloudFront statistics would be retrieved from CloudWatch
    // This is a simplified implementation
    return {
      requests: 0,
      bytesTransferred: 0,
      errorRate: 0
    };
  }

  getContentType(key) {
    const ext = key.split('.').pop().toLowerCase();
    const types = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
      'avif': 'image/avif',
      'gif': 'image/gif',
      'svg': 'image/svg+xml'
    };
    return types[ext] || 'application/octet-stream';
  }
}

/**
 * CDN Middleware for Express.js
 */
const cdnMiddleware = (cdnConfig) => {
  return (req, res, next) => {
    // Add CDN headers
    res.set('X-CDN-Provider', cdnConfig.config.primary.provider);
    res.set('X-CDN-Domain', cdnConfig.config.primary.domain);
    
    // Add CORS headers if enabled
    if (cdnConfig.config.security.corsEnabled) {
      res.set('Access-Control-Allow-Origin', cdnConfig.config.security.allowedOrigins.join(', '));
      res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }

    next();
  };
};

/**
 * Image Upload Route Handler
 */
const createImageUploadHandler = (cdnConfig) => {
  return async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { userId, type } = req.body;
      if (!userId || !type) {
        return res.status(400).json({ error: 'Missing userId or type' });
      }

      const results = await cdnConfig.uploadImage(req.file, {
        userId,
        type,
        sizes: ['thumbnail', 'small', 'medium', 'large'],
        formats: ['webp', 'jpeg']
      });

      res.json({
        success: true,
        images: results,
        original: {
          filename: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype
        }
      });
    } catch (error) {
      console.error('Image upload error:', error);
      res.status(500).json({ error: 'Image upload failed' });
    }
  };
};

/**
 * CDN Configuration Factory
 */
class CDNConfigurationFactory {
  static createInstance(config = {}) {
    return new CDNConfiguration(config);
  }

  static createMiddleware(cdnConfig) {
    return cdnMiddleware(cdnConfig);
  }

  static createImageUploadHandler(cdnConfig) {
    return createImageUploadHandler(cdnConfig);
  }

  static getDefaultConfig() {
    return {
      primary: {
        provider: 'cloudflare',
        domain: process.env.CDN_DOMAIN,
        zoneId: process.env.CLOUDFLARE_ZONE_ID,
        apiToken: process.env.CLOUDFLARE_API_TOKEN
      },
      secondary: {
        provider: 'aws-cloudfront',
        distributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,
        bucket: process.env.S3_BUCKET,
        domain: process.env.CLOUDFRONT_DOMAIN
      },
      imageOptimization: {
        enabled: true,
        formats: ['webp', 'jpeg'],
        qualities: {
          webp: 80,
          jpeg: 85
        },
        sizes: [
          { name: 'thumbnail', width: 150, height: 150 },
          { name: 'small', width: 300, height: 300 },
          { name: 'medium', width: 600, height: 600 },
          { name: 'large', width: 1200, height: 1200 }
        ]
      },
      caching: {
        defaultTTL: 31536000,
        browserTTL: 86400,
        edgeTTL: 604800
      },
      security: {
        allowedOrigins: ['*'],
        corsEnabled: true,
        hotlinkProtection: true
      }
    };
  }
}

/**
 * CDN Performance Monitoring
 */
class CDNPerformanceMonitor {
  constructor(cdnConfig) {
    this.cdnConfig = cdnConfig;
    this.metrics = {
      uploads: 0,
      uploadErrors: 0,
      invalidations: 0,
      invalidationErrors: 0,
      responseTime: [],
      cacheHitRate: 0
    };
  }

  recordUpload(success, responseTime) {
    if (success) {
      this.metrics.uploads++;
    } else {
      this.metrics.uploadErrors++;
    }
    this.metrics.responseTime.push(responseTime);
  }

  recordInvalidation(success) {
    if (success) {
      this.metrics.invalidations++;
    } else {
      this.metrics.invalidationErrors++;
    }
  }

  getMetrics() {
    const avgResponseTime = this.metrics.responseTime.length > 0
      ? this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length
      : 0;

    return {
      ...this.metrics,
      avgResponseTime,
      successRate: this.metrics.uploads / (this.metrics.uploads + this.metrics.uploadErrors) * 100
    };
  }

  reset() {
    this.metrics = {
      uploads: 0,
      uploadErrors: 0,
      invalidations: 0,
      invalidationErrors: 0,
      responseTime: [],
      cacheHitRate: 0
    };
  }
}

module.exports = {
  CDNConfiguration,
  CDNConfigurationFactory,
  CDNPerformanceMonitor,
  CloudflareProvider,
  AWSCloudFrontProvider,
  cdnMiddleware,
  createImageUploadHandler
};
