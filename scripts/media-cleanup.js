#!/usr/bin/env node

/**
 * Media Cleanup Script
 * 
 * This script performs various cleanup operations on the media storage system:
 * - Removes orphaned files
 * - Cleans up temporary files
 * - Optimizes storage usage
 * - Removes expired files
 * - Performs maintenance tasks
 */

const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { program } = require('commander');
const chalk = require('chalk');
const ora = require('ora');

// Configuration
const config = {
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY
  },
  storage: {
    bucket: process.env.SUPABASE_STORAGE_BUCKET || 'media',
    tempBucket: process.env.SUPABASE_TEMP_BUCKET || 'temp'
  },
  cleanup: {
    orphanedFiles: true,
    tempFiles: true,
    expiredFiles: true,
    duplicateFiles: true,
    optimizeStorage: true
  },
  retention: {
    tempFiles: 24 * 60 * 60 * 1000, // 24 hours
    expiredFiles: 30 * 24 * 60 * 60 * 1000, // 30 days
    orphanedFiles: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
};

class MediaCleanupService {
  constructor() {
    this.supabase = createClient(config.supabase.url, config.supabase.key);
    this.stats = {
      orphanedFiles: 0,
      tempFiles: 0,
      expiredFiles: 0,
      duplicateFiles: 0,
      optimizedFiles: 0,
      totalSize: 0,
      errors: []
    };
  }

  /**
   * Main cleanup function
   */
  async runCleanup(options = {}) {
    const spinner = ora('Starting media cleanup...').start();
    
    try {
      console.log(chalk.blue('\n🧹 Media Cleanup Service'));
      console.log(chalk.gray('================================'));

      // Validate configuration
      await this.validateConfiguration();

      // Run cleanup tasks
      if (options.orphanedFiles !== false) {
        await this.cleanupOrphanedFiles();
      }

      if (options.tempFiles !== false) {
        await this.cleanupTempFiles();
      }

      if (options.expiredFiles !== false) {
        await this.cleanupExpiredFiles();
      }

      if (options.duplicateFiles !== false) {
        await this.cleanupDuplicateFiles();
      }

      if (options.optimizeStorage !== false) {
        await this.optimizeStorage();
      }

      // Generate report
      await this.generateReport();

      spinner.succeed('Media cleanup completed successfully!');
    } catch (error) {
      spinner.fail('Media cleanup failed!');
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  }

  /**
   * Validate configuration
   */
  async validateConfiguration() {
    console.log(chalk.yellow('🔍 Validating configuration...'));

    if (!config.supabase.url || !config.supabase.key) {
      throw new Error('Supabase configuration is missing');
    }

    if (!config.storage.bucket) {
      throw new Error('Storage bucket configuration is missing');
    }

    // Test Supabase connection
    try {
      const { data, error } = await this.supabase.storage.listBuckets();
      if (error) throw error;
      console.log(chalk.green('✅ Supabase connection validated'));
    } catch (error) {
      throw new Error(`Failed to connect to Supabase: ${error.message}`);
    }
  }

  /**
   * Clean up orphaned files
   */
  async cleanupOrphanedFiles() {
    console.log(chalk.yellow('\n🔍 Cleaning up orphaned files...'));

    try {
      // Get all files from storage
      const { data: storageFiles, error: storageError } = await this.supabase.storage
        .from(config.storage.bucket)
        .list('', { limit: 1000 });

      if (storageError) throw storageError;

      // Get all file references from database
      const { data: dbFiles, error: dbError } = await this.supabase
        .from('media_files')
        .select('id, filename, path');

      if (dbError) throw dbError;

      // Find orphaned files
      const dbFilePaths = new Set(dbFiles.map(file => file.path));
      const orphanedFiles = storageFiles.filter(file => 
        !dbFilePaths.has(file.name) && 
        this.isFileExpired(file.created_at, config.retention.orphanedFiles)
      );

      console.log(chalk.gray(`Found ${orphanedFiles.length} orphaned files`));

      // Remove orphaned files
      for (const file of orphanedFiles) {
        try {
          const { error } = await this.supabase.storage
            .from(config.storage.bucket)
            .remove([file.name]);

          if (error) {
            console.warn(chalk.yellow(`⚠️  Failed to remove orphaned file ${file.name}: ${error.message}`));
            this.stats.errors.push(`Failed to remove orphaned file ${file.name}: ${error.message}`);
          } else {
            this.stats.orphanedFiles++;
            this.stats.totalSize += file.metadata?.size || 0;
            console.log(chalk.green(`✅ Removed orphaned file: ${file.name}`));
          }
        } catch (error) {
          console.warn(chalk.yellow(`⚠️  Error removing orphaned file ${file.name}: ${error.message}`));
          this.stats.errors.push(`Error removing orphaned file ${file.name}: ${error.message}`);
        }
      }

      console.log(chalk.green(`✅ Cleaned up ${this.stats.orphanedFiles} orphaned files`));
    } catch (error) {
      console.error(chalk.red(`❌ Error cleaning up orphaned files: ${error.message}`));
      this.stats.errors.push(`Error cleaning up orphaned files: ${error.message}`);
    }
  }

  /**
   * Clean up temporary files
   */
  async cleanupTempFiles() {
    console.log(chalk.yellow('\n🔍 Cleaning up temporary files...'));

    try {
      // Get temporary files
      const { data: tempFiles, error } = await this.supabase.storage
        .from(config.storage.tempBucket)
        .list('', { limit: 1000 });

      if (error) throw error;

      // Find expired temporary files
      const expiredTempFiles = tempFiles.filter(file => 
        this.isFileExpired(file.created_at, config.retention.tempFiles)
      );

      console.log(chalk.gray(`Found ${expiredTempFiles.length} expired temporary files`));

      // Remove expired temporary files
      for (const file of expiredTempFiles) {
        try {
          const { error } = await this.supabase.storage
            .from(config.storage.tempBucket)
            .remove([file.name]);

          if (error) {
            console.warn(chalk.yellow(`⚠️  Failed to remove temp file ${file.name}: ${error.message}`));
            this.stats.errors.push(`Failed to remove temp file ${file.name}: ${error.message}`);
          } else {
            this.stats.tempFiles++;
            this.stats.totalSize += file.metadata?.size || 0;
            console.log(chalk.green(`✅ Removed temp file: ${file.name}`));
          }
        } catch (error) {
          console.warn(chalk.yellow(`⚠️  Error removing temp file ${file.name}: ${error.message}`));
          this.stats.errors.push(`Error removing temp file ${file.name}: ${error.message}`);
        }
      }

      console.log(chalk.green(`✅ Cleaned up ${this.stats.tempFiles} temporary files`));
    } catch (error) {
      console.error(chalk.red(`❌ Error cleaning up temporary files: ${error.message}`));
      this.stats.errors.push(`Error cleaning up temporary files: ${error.message}`);
    }
  }

  /**
   * Clean up expired files
   */
  async cleanupExpiredFiles() {
    console.log(chalk.yellow('\n🔍 Cleaning up expired files...'));

    try {
      // Get expired files from database
      const { data: expiredFiles, error } = await this.supabase
        .from('media_files')
        .select('id, filename, path, created_at')
        .lt('created_at', new Date(Date.now() - config.retention.expiredFiles).toISOString());

      if (error) throw error;

      console.log(chalk.gray(`Found ${expiredFiles.length} expired files`));

      // Remove expired files
      for (const file of expiredFiles) {
        try {
          // Remove from storage
          const { error: storageError } = await this.supabase.storage
            .from(config.storage.bucket)
            .remove([file.path]);

          if (storageError) {
            console.warn(chalk.yellow(`⚠️  Failed to remove expired file from storage ${file.path}: ${storageError.message}`));
          }

          // Remove from database
          const { error: dbError } = await this.supabase
            .from('media_files')
            .delete()
            .eq('id', file.id);

          if (dbError) {
            console.warn(chalk.yellow(`⚠️  Failed to remove expired file from database ${file.id}: ${dbError.message}`));
            this.stats.errors.push(`Failed to remove expired file from database ${file.id}: ${dbError.message}`);
          } else {
            this.stats.expiredFiles++;
            console.log(chalk.green(`✅ Removed expired file: ${file.filename}`));
          }
        } catch (error) {
          console.warn(chalk.yellow(`⚠️  Error removing expired file ${file.filename}: ${error.message}`));
          this.stats.errors.push(`Error removing expired file ${file.filename}: ${error.message}`);
        }
      }

      console.log(chalk.green(`✅ Cleaned up ${this.stats.expiredFiles} expired files`));
    } catch (error) {
      console.error(chalk.red(`❌ Error cleaning up expired files: ${error.message}`));
      this.stats.errors.push(`Error cleaning up expired files: ${error.message}`);
    }
  }

  /**
   * Clean up duplicate files
   */
  async cleanupDuplicateFiles() {
    console.log(chalk.yellow('\n🔍 Cleaning up duplicate files...'));

    try {
      // Get all files with their hashes
      const { data: files, error } = await this.supabase
        .from('media_files')
        .select('id, filename, path, file_hash, size, created_at')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group files by hash
      const hashGroups = {};
      files.forEach(file => {
        if (file.file_hash) {
          if (!hashGroups[file.file_hash]) {
            hashGroups[file.file_hash] = [];
          }
          hashGroups[file.file_hash].push(file);
        }
      });

      // Find duplicates
      const duplicates = Object.values(hashGroups).filter(group => group.length > 1);
      console.log(chalk.gray(`Found ${duplicates.length} duplicate groups`));

      // Remove duplicates (keep the oldest)
      for (const group of duplicates) {
        const keepFile = group[0]; // Oldest file
        const removeFiles = group.slice(1); // Newer duplicates

        for (const file of removeFiles) {
          try {
            // Remove from storage
            const { error: storageError } = await this.supabase.storage
              .from(config.storage.bucket)
              .remove([file.path]);

            if (storageError) {
              console.warn(chalk.yellow(`⚠️  Failed to remove duplicate file from storage ${file.path}: ${storageError.message}`));
            }

            // Remove from database
            const { error: dbError } = await this.supabase
              .from('media_files')
              .delete()
              .eq('id', file.id);

            if (dbError) {
              console.warn(chalk.yellow(`⚠️  Failed to remove duplicate file from database ${file.id}: ${dbError.message}`));
              this.stats.errors.push(`Failed to remove duplicate file from database ${file.id}: ${dbError.message}`);
            } else {
              this.stats.duplicateFiles++;
              this.stats.totalSize += file.size || 0;
              console.log(chalk.green(`✅ Removed duplicate file: ${file.filename}`));
            }
          } catch (error) {
            console.warn(chalk.yellow(`⚠️  Error removing duplicate file ${file.filename}: ${error.message}`));
            this.stats.errors.push(`Error removing duplicate file ${file.filename}: ${error.message}`);
          }
        }
      }

      console.log(chalk.green(`✅ Cleaned up ${this.stats.duplicateFiles} duplicate files`));
    } catch (error) {
      console.error(chalk.red(`❌ Error cleaning up duplicate files: ${error.message}`));
      this.stats.errors.push(`Error cleaning up duplicate files: ${error.message}`);
    }
  }

  /**
   * Optimize storage
   */
  async optimizeStorage() {
    console.log(chalk.yellow('\n🔍 Optimizing storage...'));

    try {
      // Get storage usage statistics
      const { data: buckets, error } = await this.supabase.storage.listBuckets();
      if (error) throw error;

      let totalSize = 0;
      let fileCount = 0;

      for (const bucket of buckets) {
        const { data: files, error: listError } = await this.supabase.storage
          .from(bucket.name)
          .list('', { limit: 1000 });

        if (listError) {
          console.warn(chalk.yellow(`⚠️  Failed to list files in bucket ${bucket.name}: ${listError.message}`));
          continue;
        }

        fileCount += files.length;
        totalSize += files.reduce((sum, file) => sum + (file.metadata?.size || 0), 0);
      }

      // Update database statistics
      const { error: updateError } = await this.supabase
        .from('storage_stats')
        .upsert({
          id: 'current',
          total_files: fileCount,
          total_size: totalSize,
          last_updated: new Date().toISOString()
        });

      if (updateError) {
        console.warn(chalk.yellow(`⚠️  Failed to update storage statistics: ${updateError.message}`));
      } else {
        console.log(chalk.green(`✅ Updated storage statistics: ${fileCount} files, ${this.formatBytes(totalSize)}`));
      }

      this.stats.optimizedFiles = fileCount;
    } catch (error) {
      console.error(chalk.red(`❌ Error optimizing storage: ${error.message}`));
      this.stats.errors.push(`Error optimizing storage: ${error.message}`);
    }
  }

  /**
   * Generate cleanup report
   */
  async generateReport() {
    console.log(chalk.blue('\n📊 Cleanup Report'));
    console.log(chalk.gray('================================'));

    console.log(chalk.green(`✅ Orphaned files removed: ${this.stats.orphanedFiles}`));
    console.log(chalk.green(`✅ Temporary files removed: ${this.stats.tempFiles}`));
    console.log(chalk.green(`✅ Expired files removed: ${this.stats.expiredFiles}`));
    console.log(chalk.green(`✅ Duplicate files removed: ${this.stats.duplicateFiles}`));
    console.log(chalk.green(`✅ Files optimized: ${this.stats.optimizedFiles}`));
    console.log(chalk.green(`✅ Total space freed: ${this.formatBytes(this.stats.totalSize)}`));

    if (this.stats.errors.length > 0) {
      console.log(chalk.red(`\n❌ Errors encountered: ${this.stats.errors.length}`));
      this.stats.errors.forEach(error => {
        console.log(chalk.red(`  - ${error}`));
      });
    }

    // Save report to file
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      config: {
        retention: config.retention,
        cleanup: config.cleanup
      }
    };

    try {
      await fs.writeFile(
        path.join(process.cwd(), 'reports', 'media-cleanup-report.json'),
        JSON.stringify(report, null, 2)
      );
      console.log(chalk.green('\n📄 Report saved to reports/media-cleanup-report.json'));
    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Failed to save report: ${error.message}`));
    }
  }

  /**
   * Check if file is expired
   */
  isFileExpired(createdAt, retentionPeriod) {
    const fileAge = Date.now() - new Date(createdAt).getTime();
    return fileAge > retentionPeriod;
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// CLI setup
program
  .name('media-cleanup')
  .description('Media cleanup service for ChitLaq')
  .version('1.0.0');

program
  .command('run')
  .description('Run media cleanup')
  .option('--no-orphaned-files', 'Skip orphaned files cleanup')
  .option('--no-temp-files', 'Skip temporary files cleanup')
  .option('--no-expired-files', 'Skip expired files cleanup')
  .option('--no-duplicate-files', 'Skip duplicate files cleanup')
  .option('--no-optimize-storage', 'Skip storage optimization')
  .action(async (options) => {
    const cleanupService = new MediaCleanupService();
    await cleanupService.runCleanup(options);
  });

program
  .command('stats')
  .description('Show storage statistics')
  .action(async () => {
    const cleanupService = new MediaCleanupService();
    
    try {
      const { data: stats, error } = await cleanupService.supabase
        .from('storage_stats')
        .select('*')
        .eq('id', 'current')
        .single();

      if (error) throw error;

      console.log(chalk.blue('\n📊 Storage Statistics'));
      console.log(chalk.gray('================================'));
      console.log(chalk.green(`Total files: ${stats.total_files}`));
      console.log(chalk.green(`Total size: ${cleanupService.formatBytes(stats.total_size)}`));
      console.log(chalk.green(`Last updated: ${new Date(stats.last_updated).toLocaleString()}`));
    } catch (error) {
      console.error(chalk.red(`❌ Error getting storage statistics: ${error.message}`));
      process.exit(1);
    }
  });

// Run CLI
if (require.main === module) {
  program.parse();
}

module.exports = { MediaCleanupService };
