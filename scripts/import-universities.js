#!/usr/bin/env node

/**
 * University Import Script
 * 
 * This script imports university data from various sources into the ChitLaq database.
 * It supports CSV, JSON, and API data sources with validation and error handling.
 * 
 * Usage:
 *   node scripts/import-universities.js --source csv --file universities.csv
 *   node scripts/import-universities.js --source json --file universities.json
 *   node scripts/import-universities.js --source api --url https://api.example.com/universities
 *   node scripts/import-universities.js --source seed --file database/seed-data/universities.sql
 * 
 * Options:
 *   --source: Data source type (csv, json, api, seed)
 *   --file: File path for csv/json/seed sources
 *   --url: API URL for api source
 *   --dry-run: Validate data without importing
 *   --batch-size: Number of records to process in each batch (default: 100)
 *   --skip-validation: Skip data validation
 *   --force: Force import even if validation fails
 *   --verbose: Enable verbose logging
 *   --help: Show help message
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createClient } = require('@supabase/supabase-js');
const { Redis } = require('ioredis');
const yargs = require('yargs');

// Configuration
const config = {
  supabase: {
    url: process.env.SUPABASE_URL || 'http://localhost:54321',
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key'
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined
  }
};

// Initialize clients
const supabase = createClient(config.supabase.url, config.supabase.key);
const redis = new Redis(config.redis);

// Command line arguments
const argv = yargs
  .option('source', {
    alias: 's',
    describe: 'Data source type',
    choices: ['csv', 'json', 'api', 'seed'],
    demandOption: true
  })
  .option('file', {
    alias: 'f',
    describe: 'File path for csv/json/seed sources',
    type: 'string'
  })
  .option('url', {
    alias: 'u',
    describe: 'API URL for api source',
    type: 'string'
  })
  .option('dry-run', {
    alias: 'd',
    describe: 'Validate data without importing',
    type: 'boolean',
    default: false
  })
  .option('batch-size', {
    alias: 'b',
    describe: 'Number of records to process in each batch',
    type: 'number',
    default: 100
  })
  .option('skip-validation', {
    describe: 'Skip data validation',
    type: 'boolean',
    default: false
  })
  .option('force', {
    describe: 'Force import even if validation fails',
    type: 'boolean',
    default: false
  })
  .option('verbose', {
    alias: 'v',
    describe: 'Enable verbose logging',
    type: 'boolean',
    default: false
  })
  .help()
  .argv;

// Logging
const log = {
  info: (message) => console.log(`[INFO] ${new Date().toISOString()} - ${message}`),
  warn: (message) => console.warn(`[WARN] ${new Date().toISOString()} - ${message}`),
  error: (message) => console.error(`[ERROR] ${new Date().toISOString()} - ${message}`),
  verbose: (message) => {
    if (argv.verbose) {
      console.log(`[VERBOSE] ${new Date().toISOString()} - ${message}`);
    }
  }
};

// Validation functions
const validateUniversity = (uni) => {
  const errors = [];
  
  if (!uni.name || typeof uni.name !== 'string' || uni.name.trim().length === 0) {
    errors.push('Name is required and must be a non-empty string');
  }
  
  if (!uni.domain || typeof uni.domain !== 'string' || uni.domain.trim().length === 0) {
    errors.push('Domain is required and must be a non-empty string');
  }
  
  if (!uni.country || typeof uni.country !== 'string' || uni.country.trim().length === 0) {
    errors.push('Country is required and must be a non-empty string');
  }
  
  if (!uni.type || !['public', 'private', 'community'].includes(uni.type)) {
    errors.push('Type must be one of: public, private, community');
  }
  
  if (!uni.status || !['active', 'inactive', 'pending'].includes(uni.status)) {
    errors.push('Status must be one of: active, inactive, pending');
  }
  
  if (uni.max_students && (typeof uni.max_students !== 'number' || uni.max_students < 0)) {
    errors.push('Max students must be a non-negative number');
  }
  
  if (uni.current_students && (typeof uni.current_students !== 'number' || uni.current_students < 0)) {
    errors.push('Current students must be a non-negative number');
  }
  
  if (uni.established_year && (typeof uni.established_year !== 'number' || uni.established_year < 1000 || uni.established_year > new Date().getFullYear())) {
    errors.push('Established year must be a valid year');
  }
  
  if (uni.website && !isValidUrl(uni.website)) {
    errors.push('Website must be a valid URL');
  }
  
  if (uni.contact_email && !isValidEmail(uni.contact_email)) {
    errors.push('Contact email must be a valid email address');
  }
  
  if (uni.phone && typeof uni.phone !== 'string') {
    errors.push('Phone must be a string');
  }
  
  if (uni.address && typeof uni.address !== 'string') {
    errors.push('Address must be a string');
  }
  
  if (uni.city && typeof uni.city !== 'string') {
    errors.push('City must be a string');
  }
  
  if (uni.state && typeof uni.state !== 'string') {
    errors.push('State must be a string');
  }
  
  if (uni.postal_code && typeof uni.postal_code !== 'string') {
    errors.push('Postal code must be a string');
  }
  
  if (uni.timezone && typeof uni.timezone !== 'string') {
    errors.push('Timezone must be a string');
  }
  
  if (uni.language && typeof uni.language !== 'string') {
    errors.push('Language must be a string');
  }
  
  if (uni.accreditation && !Array.isArray(uni.accreditation)) {
    errors.push('Accreditation must be an array');
  }
  
  if (uni.partnerships && !Array.isArray(uni.partnerships)) {
    errors.push('Partnerships must be an array');
  }
  
  if (uni.features && typeof uni.features !== 'object') {
    errors.push('Features must be an object');
  }
  
  if (uni.metadata && typeof uni.metadata !== 'object') {
    errors.push('Metadata must be an object');
  }
  
  return errors;
};

const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Data processing functions
const processCsvFile = async (filePath) => {
  return new Promise((resolve, reject) => {
    const universities = [];
    const errors = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        try {
          const uni = {
            name: row.name?.trim(),
            domain: row.domain?.trim(),
            country: row.country?.trim(),
            type: row.type?.trim(),
            status: row.status?.trim() || 'active',
            prefixes: row.prefixes ? JSON.parse(row.prefixes) : [],
            departments: row.departments ? JSON.parse(row.departments) : [],
            faculties: row.faculties ? JSON.parse(row.faculties) : [],
            academic_year_format: row.academic_year_format?.trim() || 'YYYY',
            email_format: row.email_format?.trim() || 'firstname.lastname@domain',
            verification_required: row.verification_required === 'true',
            max_students: row.max_students ? parseInt(row.max_students) : 0,
            current_students: row.current_students ? parseInt(row.current_students) : 0,
            established_year: row.established_year ? parseInt(row.established_year) : null,
            website: row.website?.trim(),
            contact_email: row.contact_email?.trim(),
            phone: row.phone?.trim(),
            address: row.address?.trim(),
            city: row.city?.trim(),
            state: row.state?.trim(),
            postal_code: row.postal_code?.trim(),
            timezone: row.timezone?.trim(),
            language: row.language?.trim(),
            accreditation: row.accreditation ? JSON.parse(row.accreditation) : [],
            partnerships: row.partnerships ? JSON.parse(row.partnerships) : [],
            features: row.features ? JSON.parse(row.features) : {},
            metadata: row.metadata ? JSON.parse(row.metadata) : {}
          };
          
          if (!argv.skipValidation) {
            const validationErrors = validateUniversity(uni);
            if (validationErrors.length > 0) {
              errors.push({ row: universities.length + 1, errors: validationErrors });
            }
          }
          
          universities.push(uni);
        } catch (error) {
          errors.push({ row: universities.length + 1, errors: [error.message] });
        }
      })
      .on('end', () => {
        if (errors.length > 0 && !argv.force) {
          reject(new Error(`Validation failed for ${errors.length} rows. Use --force to ignore validation errors.`));
        } else {
          resolve({ universities, errors });
        }
      })
      .on('error', reject);
  });
};

const processJsonFile = async (filePath) => {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const universities = Array.isArray(data) ? data : data.universities || [];
    const errors = [];
    
    if (!argv.skipValidation) {
      universities.forEach((uni, index) => {
        const validationErrors = validateUniversity(uni);
        if (validationErrors.length > 0) {
          errors.push({ row: index + 1, errors: validationErrors });
        }
      });
    }
    
    if (errors.length > 0 && !argv.force) {
      throw new Error(`Validation failed for ${errors.length} rows. Use --force to ignore validation errors.`);
    }
    
    return { universities, errors };
  } catch (error) {
    throw new Error(`Failed to process JSON file: ${error.message}`);
  }
};

const processApiData = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const universities = Array.isArray(data) ? data : data.universities || [];
    const errors = [];
    
    if (!argv.skipValidation) {
      universities.forEach((uni, index) => {
        const validationErrors = validateUniversity(uni);
        if (validationErrors.length > 0) {
          errors.push({ row: index + 1, errors: validationErrors });
        }
      });
    }
    
    if (errors.length > 0 && !argv.force) {
      throw new Error(`Validation failed for ${errors.length} rows. Use --force to ignore validation errors.`);
    }
    
    return { universities, errors };
  } catch (error) {
    throw new Error(`Failed to process API data: ${error.message}`);
  }
};

const processSeedFile = async (filePath) => {
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    
    if (argv.dryRun) {
      log.info('Dry run: Would execute SQL seed file');
      return { universities: [], errors: [] };
    }
    
    const { error } = await supabase.rpc('execute_sql', { sql });
    if (error) {
      throw new Error(`Failed to execute seed file: ${error.message}`);
    }
    
    log.info('Successfully executed seed file');
    return { universities: [], errors: [] };
  } catch (error) {
    throw new Error(`Failed to process seed file: ${error.message}`);
  }
};

// Import functions
const importUniversities = async (universities) => {
  if (argv.dryRun) {
    log.info(`Dry run: Would import ${universities.length} universities`);
    return;
  }
  
  const batchSize = argv.batchSize;
  const totalBatches = Math.ceil(universities.length / batchSize);
  let imported = 0;
  let errors = 0;
  
  for (let i = 0; i < totalBatches; i++) {
    const batch = universities.slice(i * batchSize, (i + 1) * batchSize);
    
    try {
      const { error } = await supabase
        .from('universities')
        .insert(batch);
      
      if (error) {
        log.error(`Batch ${i + 1} failed: ${error.message}`);
        errors += batch.length;
      } else {
        imported += batch.length;
        log.info(`Batch ${i + 1}/${totalBatches} imported successfully (${imported}/${universities.length})`);
      }
    } catch (error) {
      log.error(`Batch ${i + 1} failed: ${error.message}`);
      errors += batch.length;
    }
  }
  
  log.info(`Import completed: ${imported} imported, ${errors} failed`);
};

// Main execution
const main = async () => {
  try {
    log.info(`Starting university import from ${argv.source} source`);
    
    let result;
    
    switch (argv.source) {
      case 'csv':
        if (!argv.file) {
          throw new Error('File path is required for CSV source');
        }
        result = await processCsvFile(argv.file);
        break;
        
      case 'json':
        if (!argv.file) {
          throw new Error('File path is required for JSON source');
        }
        result = await processJsonFile(argv.file);
        break;
        
      case 'api':
        if (!argv.url) {
          throw new Error('API URL is required for API source');
        }
        result = await processApiData(argv.url);
        break;
        
      case 'seed':
        if (!argv.file) {
          throw new Error('File path is required for seed source');
        }
        result = await processSeedFile(argv.file);
        break;
        
      default:
        throw new Error(`Unsupported source type: ${argv.source}`);
    }
    
    const { universities, errors } = result;
    
    if (errors.length > 0) {
      log.warn(`Validation errors found: ${errors.length}`);
      if (argv.verbose) {
        errors.forEach(({ row, errors: rowErrors }) => {
          log.warn(`Row ${row}: ${rowErrors.join(', ')}`);
        });
      }
    }
    
    if (universities.length > 0) {
      await importUniversities(universities);
    }
    
    log.info('University import completed successfully');
  } catch (error) {
    log.error(`Import failed: ${error.message}`);
    process.exit(1);
  } finally {
    await redis.disconnect();
  }
};

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  validateUniversity,
  processCsvFile,
  processJsonFile,
  processApiData,
  processSeedFile,
  importUniversities
};
