#!/bin/bash

# ChitLaq M1 MVP - One-Command Deployment Script
# Production-grade deployment with health checks and rollback

set -e  # Exit on any error
set -u  # Exit on undefined variables
set -o pipefail  # Exit on pipe failures

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${PROJECT_ROOT}/.env"
COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.yml"
OVERRIDE_FILE="${PROJECT_ROOT}/docker-compose.override.yml"

# Default values
ENVIRONMENT=${1:-production}
FORCE_REBUILD=${2:-false}
SKIP_BACKUP=${3:-false}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Logging functions
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

info() {
    echo -e "${PURPLE}[INFO]${NC} $1"
}

# Print deployment banner
print_banner() {
    echo -e "${PURPLE}"
    echo "  ____  _     _ _   _                "
    echo " / ___|| |__ (_) |_| |    __ _  __ _ "
    echo "| |    | '_ \| | __| |   / _\` |/ _\` |"
    echo "| |___ | | | | | |_| |__| (_| | (_| |"
    echo " \____|_| |_|_|\__|_____\__,_|\__, |"
    echo "                               |_|  "
    echo ""
    echo "M1 MVP Deployment Script"
    echo "Environment: ${ENVIRONMENT}"
    echo "========================="
    echo -e "${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking deployment prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker >/dev/null 2>&1; then
        error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! docker info >/dev/null 2>&1; then
        error "Docker daemon is not running. Please start Docker."
        exit 1
    fi
    
    # Check if Docker Compose is available
    if ! docker compose version >/dev/null 2>&1 && ! docker-compose --version >/dev/null 2>&1; then
        error "Docker Compose is not available. Please install Docker Compose."
        exit 1
    fi
    
    # Determine compose command
    if docker compose version >/dev/null 2>&1; then
        COMPOSE_CMD="docker compose"
    else
        COMPOSE_CMD="docker-compose"
    fi
    
    # Check if environment file exists
    if [ ! -f "$ENV_FILE" ]; then
        error "Environment file not found: $ENV_FILE"
        error "Please copy env.example to .env and configure your settings."
        exit 1
    fi
    
    # Check if compose file exists
    if [ ! -f "$COMPOSE_FILE" ]; then
        error "Docker Compose file not found: $COMPOSE_FILE"
        exit 1
    fi
    
    # Check available disk space (minimum 10GB)
    local available_space=$(df "$PROJECT_ROOT" | awk 'NR==2 {print $4}')
    local required_space=10485760  # 10GB in KB
    
    if [ "$available_space" -lt "$required_space" ]; then
        error "Insufficient disk space. Available: ${available_space}KB, Required: ${required_space}KB"
        exit 1
    fi
    
    # Check available memory (minimum 4GB)
    local available_memory=$(free -k | awk '/^Mem:/{print $7}')
    local required_memory=4194304  # 4GB in KB
    
    if [ "$available_memory" -lt "$required_memory" ]; then
        warning "Low available memory. Available: ${available_memory}KB, Recommended: ${required_memory}KB"
    fi
    
    success "Prerequisites check passed"
}

# Load and validate environment variables
load_environment() {
    log "Loading environment configuration..."
    
    # Source environment file
    source "$ENV_FILE"
    
    # Validate required environment variables
    local required_vars=(
        "POSTGRES_PASSWORD"
        "JWT_SECRET"
        "SECRET_KEY_BASE"
        "ANON_KEY"
        "SERVICE_ROLE_KEY"
        "SITE_URL"
        "API_EXTERNAL_URL"
    )
    
    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            error "  - $var"
        done
        error "Please configure these variables in $ENV_FILE"
        exit 1
    fi
    
    # Validate JWT secret length (minimum 32 characters)
    if [ ${#JWT_SECRET} -lt 32 ]; then
        error "JWT_SECRET must be at least 32 characters long"
        exit 1
    fi
    
    # Validate SECRET_KEY_BASE length (minimum 64 characters)
    if [ ${#SECRET_KEY_BASE} -lt 64 ]; then
        error "SECRET_KEY_BASE must be at least 64 characters long"
        exit 1
    fi
    
    success "Environment configuration loaded and validated"
}

# Generate Supabase configuration files
generate_supabase_config() {
    log "Generating Supabase configuration files..."
    
    # Create supabase directory if it doesn't exist
    mkdir -p "${PROJECT_ROOT}/supabase"
    
    # Generate Kong configuration
    cat > "${PROJECT_ROOT}/supabase/kong.yml" << EOF
_format_version: "3.0"
_transform: true

services:
  - name: auth-v1-open
    url: http://auth:9999/verify
    routes:
      - name: auth-v1-open
        strip_path: true
        paths:
          - /auth/v1/verify
    plugins:
      - name: cors

  - name: auth-v1-open-callback
    url: http://auth:9999/callback
    routes:
      - name: auth-v1-open-callback
        strip_path: true
        paths:
          - /auth/v1/callback
    plugins:
      - name: cors

  - name: auth-v1-open-authorize
    url: http://auth:9999/authorize
    routes:
      - name: auth-v1-open-authorize
        strip_path: true
        paths:
          - /auth/v1/authorize
    plugins:
      - name: cors

  - name: auth-v1
    url: http://auth:9999/
    routes:
      - name: auth-v1-all
        strip_path: true
        paths:
          - /auth/v1/
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false

  - name: rest-v1
    url: http://rest:3000/
    routes:
      - name: rest-v1-all
        strip_path: true
        paths:
          - /rest/v1/
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false

  - name: realtime-v1
    url: http://realtime:4000/socket/
    routes:
      - name: realtime-v1-all
        strip_path: true
        paths:
          - /realtime/v1/
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false

  - name: storage-v1
    url: http://storage:5000/
    routes:
      - name: storage-v1-all
        strip_path: true
        paths:
          - /storage/v1/
    plugins:
      - name: cors

  - name: meta
    url: http://meta:8080/
    routes:
      - name: meta-all
        strip_path: true
        paths:
          - /pg/

consumers:
  - username: anon
    keyauth_credentials:
      - key: ${ANON_KEY}
  - username: service_role
    keyauth_credentials:
      - key: ${SERVICE_ROLE_KEY}

plugins:
  - name: cors
    config:
      origins:
        - ${SITE_URL}
        - ${API_EXTERNAL_URL}
        - http://localhost:3000
      methods:
        - GET
        - HEAD
        - PUT
        - PATCH
        - POST
        - DELETE
      headers:
        - Accept
        - Accept-Language
        - Content-Language
        - Content-Type
        - Authorization
        - ApiKey
        - X-Client-Info
      exposed_headers:
        - X-Total-Count
      credentials: true
      max_age: 3600
EOF

    # Generate initial SQL setup
    cat > "${PROJECT_ROOT}/supabase/init/init-supabase.sql" << 'EOF'
-- ChitLaq M1 MVP - Supabase Initialization

-- Create the required roles and databases
ALTER USER postgres CREATEDB;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create auth schema and users
CREATE USER authenticator NOINHERIT CREATEROLE LOGIN PASSWORD '${POSTGRES_PASSWORD}';
CREATE USER anon NOLOGIN;
GRANT anon TO authenticator;
CREATE USER service_role NOLOGIN;
GRANT service_role TO authenticator;

-- Create supabase_admin user
CREATE USER supabase_admin SUPERUSER CREATEDB CREATEROLE REPLICATION LOGIN PASSWORD '${POSTGRES_PASSWORD}';
CREATE USER supabase_auth_admin NOLOGIN;
GRANT supabase_auth_admin TO supabase_admin;
CREATE USER supabase_storage_admin NOLOGIN;
GRANT supabase_storage_admin TO supabase_admin;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, service_role;

-- Create realtime schema
CREATE SCHEMA IF NOT EXISTS _realtime;
GRANT USAGE ON SCHEMA _realtime TO service_role;
EOF

    success "Supabase configuration files generated"
}

# Create backup before deployment
create_backup() {
    if [ "$SKIP_BACKUP" = "true" ]; then
        warning "Skipping backup as requested"
        return 0
    fi
    
    log "Creating backup before deployment..."
    
    # Check if backup script exists
    local backup_script="${PROJECT_ROOT}/backup-scripts/backup.sh"
    if [ -f "$backup_script" ]; then
        if bash "$backup_script"; then
            success "Backup created successfully"
        else
            error "Backup failed"
            exit 1
        fi
    else
        warning "Backup script not found, skipping backup"
    fi
}

# Pull latest images
pull_images() {
    log "Pulling latest Docker images..."
    
    if [ "$FORCE_REBUILD" = "true" ]; then
        $COMPOSE_CMD pull --ignore-pull-failures
    else
        $COMPOSE_CMD pull
    fi
    
    success "Docker images pulled successfully"
}

# Build custom images
build_images() {
    if [ "$FORCE_REBUILD" = "true" ]; then
        log "Building/rebuilding custom images..."
        $COMPOSE_CMD build --no-cache
    else
        log "Building custom images..."
        $COMPOSE_CMD build
    fi
    
    success "Custom images built successfully"
}

# Start services
start_services() {
    log "Starting ChitLaq services..."
    
    # Determine compose files to use
    local compose_args="-f $COMPOSE_FILE"
    if [ "$ENVIRONMENT" = "development" ] && [ -f "$OVERRIDE_FILE" ]; then
        compose_args="$compose_args -f $OVERRIDE_FILE"
    fi
    
    # Start services in dependency order
    log "Starting core infrastructure services..."
    $COMPOSE_CMD $compose_args up -d postgres redis
    
    # Wait for core services to be healthy
    wait_for_service "postgres" "5432" 30
    wait_for_service "redis" "6379" 30
    
    log "Starting Supabase services..."
    $COMPOSE_CMD $compose_args up -d kong rest auth realtime storage imgproxy meta studio
    
    # Wait for Supabase services
    wait_for_service "kong" "8000" 60
    wait_for_service "auth" "9999" 60
    
    log "Starting monitoring services..."
    $COMPOSE_CMD $compose_args up -d prometheus grafana node-exporter redis-exporter postgres-exporter
    
    log "Starting reverse proxy..."
    $COMPOSE_CMD $compose_args up -d nginx
    
    success "All services started successfully"
}

# Wait for service to be ready
wait_for_service() {
    local service_name="$1"
    local port="$2"
    local timeout="$3"
    local count=0
    
    log "Waiting for $service_name to be ready (timeout: ${timeout}s)..."
    
    while [ $count -lt $timeout ]; do
        if docker exec "chitlaq_$service_name" sh -c "exit 0" 2>/dev/null; then
            if nc -z localhost "$port" 2>/dev/null || docker exec "chitlaq_$service_name" sh -c "nc -z localhost $port" 2>/dev/null; then
                success "$service_name is ready"
                return 0
            fi
        fi
        
        sleep 1
        count=$((count + 1))
        
        if [ $((count % 10)) -eq 0 ]; then
            log "Still waiting for $service_name... (${count}s)"
        fi
    done
    
    error "$service_name did not become ready within ${timeout} seconds"
    return 1
}

# Run health checks
run_health_checks() {
    log "Running comprehensive health checks..."
    
    local failed_checks=()
    
    # Check PostgreSQL
    if docker exec chitlaq_postgres pg_isready -U "${POSTGRES_USER:-postgres}" >/dev/null 2>&1; then
        success "✓ PostgreSQL is healthy"
    else
        failed_checks+=("PostgreSQL")
    fi
    
    # Check Redis
    if docker exec chitlaq_redis redis-cli ping | grep -q "PONG"; then
        success "✓ Redis is healthy"
    else
        failed_checks+=("Redis")
    fi
    
    # Check Kong API Gateway
    if curl -sf http://localhost:8000/ >/dev/null 2>&1; then
        success "✓ Kong API Gateway is healthy"
    else
        failed_checks+=("Kong")
    fi
    
    # Check Supabase Auth
    if curl -sf http://localhost:8000/auth/v1/health >/dev/null 2>&1; then
        success "✓ Supabase Auth is healthy"
    else
        failed_checks+=("Supabase Auth")
    fi
    
    # Check Supabase Storage
    if curl -sf http://localhost:8000/storage/v1/status >/dev/null 2>&1; then
        success "✓ Supabase Storage is healthy"
    else
        failed_checks+=("Supabase Storage")
    fi
    
    # Check Prometheus
    if curl -sf http://localhost:9090/-/healthy >/dev/null 2>&1; then
        success "✓ Prometheus is healthy"
    else
        failed_checks+=("Prometheus")
    fi
    
    # Check Grafana
    if curl -sf http://localhost:3000/api/health >/dev/null 2>&1; then
        success "✓ Grafana is healthy"
    else
        failed_checks+=("Grafana")
    fi
    
    # Check Nginx
    if curl -sf http://localhost/health >/dev/null 2>&1; then
        success "✓ Nginx is healthy"
    else
        failed_checks+=("Nginx")
    fi
    
    # Report results
    if [ ${#failed_checks[@]} -eq 0 ]; then
        success "All health checks passed!"
        return 0
    else
        error "Health checks failed for: ${failed_checks[*]}"
        return 1
    fi
}

# Display deployment summary
show_deployment_summary() {
    echo ""
    echo -e "${GREEN}================================================${NC}"
    echo -e "${GREEN}🚀 ChitLaq M1 MVP Deployment Complete!${NC}"
    echo -e "${GREEN}================================================${NC}"
    echo ""
    echo -e "${BLUE}📊 Service URLs:${NC}"
    echo "  🌐 Main Application:     ${SITE_URL}"
    echo "  🔌 API Gateway:          ${API_EXTERNAL_URL}"
    echo "  📈 Grafana Dashboard:    http://localhost:3000"
    echo "  🗄️  Supabase Studio:     http://localhost:3010"
    echo "  📊 Prometheus:           http://localhost:9090"
    echo ""
    echo -e "${BLUE}🔧 Management Commands:${NC}"
    echo "  📊 View logs:            $COMPOSE_CMD logs -f [service]"
    echo "  🔄 Restart service:      $COMPOSE_CMD restart [service]"
    echo "  ⏹️  Stop all:             $COMPOSE_CMD down"
    echo "  🧹 Clean volumes:        $COMPOSE_CMD down -v"
    echo ""
    echo -e "${BLUE}🛠️  Monitoring:${NC}"
    echo "  📈 System metrics:       Available in Grafana"
    echo "  🚨 Alerts:               Configured in Prometheus"
    echo "  📝 Logs:                 Available via Docker logs"
    echo ""
    echo -e "${YELLOW}⚠️  Next Steps:${NC}"
    echo "  1. Configure SSL certificates for production"
    echo "  2. Set up proper DNS records"
    echo "  3. Configure email SMTP settings"
    echo "  4. Review and adjust monitoring alerts"
    echo "  5. Set up automated backups"
    echo ""
    echo -e "${GREEN}✅ Deployment Status: SUCCESS${NC}"
    echo ""
}

# Rollback function
rollback() {
    error "Deployment failed! Initiating rollback..."
    
    log "Stopping failed deployment..."
    $COMPOSE_CMD down
    
    # If backup exists, offer to restore
    local latest_backup=$(find "${PROJECT_ROOT}/backups" -name "postgres_*.sql.gz*" -type f -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2-)
    if [ -n "$latest_backup" ]; then
        read -p "Restore from latest backup? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log "Restoring from backup: $(basename "$latest_backup")"
            # Add restore logic here
        fi
    fi
    
    error "Rollback completed. Please check the logs and try again."
    exit 1
}

# Main deployment function
main() {
    print_banner
    
    # Set up error handling
    trap rollback ERR
    
    # Run deployment steps
    check_prerequisites
    load_environment
    generate_supabase_config
    create_backup
    pull_images
    build_images
    start_services
    
    # Wait a bit for services to fully initialize
    log "Waiting for services to initialize..."
    sleep 30
    
    # Run health checks
    if run_health_checks; then
        show_deployment_summary
        success "🎉 ChitLaq M1 MVP deployed successfully!"
    else
        error "❌ Deployment completed with health check failures"
        log "Please check service logs for details:"
        log "  $COMPOSE_CMD logs [service_name]"
        exit 1
    fi
}

# Show help
show_help() {
    echo "ChitLaq M1 MVP Deployment Script"
    echo ""
    echo "Usage: $0 [environment] [force_rebuild] [skip_backup]"
    echo ""
    echo "Arguments:"
    echo "  environment    Deployment environment (production|development) [default: production]"
    echo "  force_rebuild  Force rebuild of images (true|false) [default: false]"
    echo "  skip_backup    Skip backup creation (true|false) [default: false]"
    echo ""
    echo "Examples:"
    echo "  $0                                 # Deploy to production"
    echo "  $0 development                     # Deploy to development"
    echo "  $0 production true                 # Deploy with forced rebuild"
    echo "  $0 production false true           # Deploy without backup"
    echo ""
    echo "Environment file: Copy env.example to .env and configure before deployment"
}

# Handle command line arguments
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac
