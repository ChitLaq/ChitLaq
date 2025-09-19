#!/bin/bash

# ChitLaq M1 MVP - Automated Backup Script
# Production-grade backup with encryption and retention

set -e  # Exit on any error
set -u  # Exit on undefined variables
set -o pipefail  # Exit on pipe failures

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${PROJECT_ROOT}/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
ENCRYPT_KEY=${BACKUP_ENCRYPTION_KEY:-""}

# Load environment variables
if [ -f "${PROJECT_ROOT}/.env" ]; then
    source "${PROJECT_ROOT}/.env"
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        error "Docker is not running or not accessible"
        exit 1
    fi
    
    # Check if required containers are running
    local required_containers=("chitlaq_postgres" "chitlaq_redis")
    for container in "${required_containers[@]}"; do
        if ! docker ps --format "table {{.Names}}" | grep -q "^${container}$"; then
            error "Required container ${container} is not running"
            exit 1
        fi
    done
    
    # Check if backup directory exists
    if [ ! -d "$BACKUP_DIR" ]; then
        log "Creating backup directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi
    
    # Check disk space (require at least 2GB free)
    local available_space=$(df "$BACKUP_DIR" | awk 'NR==2 {print $4}')
    local required_space=2097152  # 2GB in KB
    
    if [ "$available_space" -lt "$required_space" ]; then
        error "Insufficient disk space. Available: ${available_space}KB, Required: ${required_space}KB"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Create PostgreSQL backup
backup_postgres() {
    log "Starting PostgreSQL backup..."
    
    local backup_file="${BACKUP_DIR}/postgres_${TIMESTAMP}.sql"
    local compressed_file="${backup_file}.gz"
    
    # Create database backup using pg_dump through Docker
    docker exec chitlaq_postgres pg_dumpall -c -U "${POSTGRES_USER:-postgres}" > "$backup_file"
    
    if [ $? -eq 0 ]; then
        # Compress the backup
        gzip "$backup_file"
        
        # Encrypt if encryption key is provided
        if [ -n "$ENCRYPT_KEY" ]; then
            openssl enc -aes-256-cbc -salt -in "$compressed_file" -out "${compressed_file}.enc" -pass pass:"$ENCRYPT_KEY"
            rm "$compressed_file"
            compressed_file="${compressed_file}.enc"
        fi
        
        local file_size=$(stat -f%z "$compressed_file" 2>/dev/null || stat -c%s "$compressed_file" 2>/dev/null || echo "unknown")
        success "PostgreSQL backup completed: $(basename "$compressed_file") (${file_size} bytes)"
        echo "$compressed_file"
    else
        error "PostgreSQL backup failed"
        return 1
    fi
}

# Create Redis backup
backup_redis() {
    log "Starting Redis backup..."
    
    local backup_file="${BACKUP_DIR}/redis_${TIMESTAMP}.rdb"
    local compressed_file="${backup_file}.gz"
    
    # Trigger Redis save and copy the RDB file
    docker exec chitlaq_redis redis-cli BGSAVE
    
    # Wait for background save to complete
    local save_status=""
    while [ "$save_status" != "OK" ]; do
        sleep 1
        save_status=$(docker exec chitlaq_redis redis-cli LASTSAVE)
        log "Waiting for Redis BGSAVE to complete..."
    done
    
    # Copy RDB file from container
    docker cp chitlaq_redis:/data/dump.rdb "$backup_file"
    
    if [ $? -eq 0 ]; then
        # Compress the backup
        gzip "$backup_file"
        
        # Encrypt if encryption key is provided
        if [ -n "$ENCRYPT_KEY" ]; then
            openssl enc -aes-256-cbc -salt -in "$compressed_file" -out "${compressed_file}.enc" -pass pass:"$ENCRYPT_KEY"
            rm "$compressed_file"
            compressed_file="${compressed_file}.enc"
        fi
        
        local file_size=$(stat -f%z "$compressed_file" 2>/dev/null || stat -c%s "$compressed_file" 2>/dev/null || echo "unknown")
        success "Redis backup completed: $(basename "$compressed_file") (${file_size} bytes)"
        echo "$compressed_file"
    else
        error "Redis backup failed"
        return 1
    fi
}

# Create storage backup
backup_storage() {
    log "Starting storage backup..."
    
    local backup_file="${BACKUP_DIR}/storage_${TIMESTAMP}.tar.gz"
    
    # Create tar archive of storage volume
    docker run --rm \
        -v chitlaq_storage_data:/source:ro \
        -v "${BACKUP_DIR}:/backup" \
        alpine:latest \
        tar -czf "/backup/$(basename "$backup_file")" -C /source .
    
    if [ $? -eq 0 ]; then
        # Encrypt if encryption key is provided
        if [ -n "$ENCRYPT_KEY" ]; then
            openssl enc -aes-256-cbc -salt -in "$backup_file" -out "${backup_file}.enc" -pass pass:"$ENCRYPT_KEY"
            rm "$backup_file"
            backup_file="${backup_file}.enc"
        fi
        
        local file_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null || echo "unknown")
        success "Storage backup completed: $(basename "$backup_file") (${file_size} bytes)"
        echo "$backup_file"
    else
        error "Storage backup failed"
        return 1
    fi
}

# Create configuration backup
backup_configs() {
    log "Starting configuration backup..."
    
    local backup_file="${BACKUP_DIR}/configs_${TIMESTAMP}.tar.gz"
    
    # Create tar archive of configuration files
    tar -czf "$backup_file" -C "$PROJECT_ROOT" \
        docker-compose.yml \
        docker-compose.override.yml \
        nginx/ \
        monitoring/ \
        supabase/ \
        scripts/ \
        .env 2>/dev/null || true
    
    if [ $? -eq 0 ]; then
        # Encrypt if encryption key is provided
        if [ -n "$ENCRYPT_KEY" ]; then
            openssl enc -aes-256-cbc -salt -in "$backup_file" -out "${backup_file}.enc" -pass pass:"$ENCRYPT_KEY"
            rm "$backup_file"
            backup_file="${backup_file}.enc"
        fi
        
        local file_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null || echo "unknown")
        success "Configuration backup completed: $(basename "$backup_file") (${file_size} bytes)"
        echo "$backup_file"
    else
        error "Configuration backup failed"
        return 1
    fi
}

# Clean old backups
cleanup_old_backups() {
    log "Cleaning up backups older than ${RETENTION_DAYS} days..."
    
    local deleted_count=0
    
    # Find and delete old backup files
    find "$BACKUP_DIR" -name "*.sql.gz*" -mtime +"$RETENTION_DAYS" -delete 2>/dev/null && ((deleted_count++)) || true
    find "$BACKUP_DIR" -name "*.rdb.gz*" -mtime +"$RETENTION_DAYS" -delete 2>/dev/null && ((deleted_count++)) || true
    find "$BACKUP_DIR" -name "storage_*.tar.gz*" -mtime +"$RETENTION_DAYS" -delete 2>/dev/null && ((deleted_count++)) || true
    find "$BACKUP_DIR" -name "configs_*.tar.gz*" -mtime +"$RETENTION_DAYS" -delete 2>/dev/null && ((deleted_count++)) || true
    
    if [ "$deleted_count" -gt 0 ]; then
        success "Cleaned up old backup files"
    else
        log "No old backup files to clean up"
    fi
}

# Generate backup report
generate_report() {
    local postgres_backup="$1"
    local redis_backup="$2"
    local storage_backup="$3"
    local configs_backup="$4"
    
    local report_file="${BACKUP_DIR}/backup_report_${TIMESTAMP}.txt"
    
    cat > "$report_file" << EOF
ChitLaq Backup Report
=====================
Date: $(date)
Timestamp: ${TIMESTAMP}

Backup Files:
- PostgreSQL: $(basename "$postgres_backup")
- Redis: $(basename "$redis_backup")
- Storage: $(basename "$storage_backup")
- Configurations: $(basename "$configs_backup")

Backup Location: ${BACKUP_DIR}
Encryption: $([ -n "$ENCRYPT_KEY" ] && echo "Enabled" || echo "Disabled")
Retention: ${RETENTION_DAYS} days

System Information:
- Host: $(hostname)
- Docker Version: $(docker --version)
- Available Disk Space: $(df -h "$BACKUP_DIR" | awk 'NR==2 {print $4}')

Backup Status: SUCCESS
EOF

    success "Backup report generated: $(basename "$report_file")"
    echo "$report_file"
}

# Upload to remote storage (optional)
upload_to_remote() {
    local backup_files=("$@")
    
    # Check if S3 backup is configured
    if [ -n "${BACKUP_S3_BUCKET:-}" ]; then
        log "Uploading backups to S3..."
        
        for backup_file in "${backup_files[@]}"; do
            if command -v aws >/dev/null 2>&1; then
                aws s3 cp "$backup_file" "s3://${BACKUP_S3_BUCKET}/backups/$(basename "$backup_file")" 2>/dev/null
                if [ $? -eq 0 ]; then
                    success "Uploaded $(basename "$backup_file") to S3"
                else
                    warning "Failed to upload $(basename "$backup_file") to S3"
                fi
            else
                warning "AWS CLI not found, skipping S3 upload"
                break
            fi
        done
    fi
}

# Main backup function
main() {
    log "Starting ChitLaq backup process..."
    
    # Check prerequisites
    check_prerequisites
    
    # Create backups
    local postgres_backup redis_backup storage_backup configs_backup
    
    postgres_backup=$(backup_postgres) || exit 1
    redis_backup=$(backup_redis) || exit 1
    storage_backup=$(backup_storage) || exit 1
    configs_backup=$(backup_configs) || exit 1
    
    # Generate report
    local report_file
    report_file=$(generate_report "$postgres_backup" "$redis_backup" "$storage_backup" "$configs_backup")
    
    # Upload to remote storage if configured
    upload_to_remote "$postgres_backup" "$redis_backup" "$storage_backup" "$configs_backup" "$report_file"
    
    # Clean up old backups
    cleanup_old_backups
    
    success "Backup process completed successfully!"
    log "Backup files created:"
    log "  - $(basename "$postgres_backup")"
    log "  - $(basename "$redis_backup")"
    log "  - $(basename "$storage_backup")"
    log "  - $(basename "$configs_backup")"
    log "  - $(basename "$report_file")"
}

# Handle script termination
cleanup_on_exit() {
    if [ $? -ne 0 ]; then
        error "Backup process failed!"
    fi
}

trap cleanup_on_exit EXIT

# Run main function
main "$@"
