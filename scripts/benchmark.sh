#!/bin/bash
# scripts/benchmark.sh
# ChitLaq M1 MVP - Performance Benchmarking Script
# Senior Performance Engineer - 15+ years benchmarking and optimization experience

# ============================================================================
# PERFORMANCE BENCHMARKING SCRIPT FOR CHITLAQ M1 MVP
# ============================================================================
# This script provides comprehensive performance benchmarking capabilities
# for the ChitLaq social media platform.
#
# Features:
# - API endpoint benchmarking
# - Database performance testing
# - WebSocket connection testing
# - Load testing with multiple scenarios
# - Performance regression detection
# - Automated reporting and analysis
# ============================================================================

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

# Default configuration
BASE_URL="${BASE_URL:-http://localhost:3001}"
API_BASE_URL="${API_BASE_URL:-$BASE_URL/api}"
WS_BASE_URL="${WS_BASE_URL:-ws://localhost:3002}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-chitlaq}"
DB_USER="${DB_USER:-postgres}"

# Benchmark configuration
CONCURRENT_USERS="${CONCURRENT_USERS:-100}"
TEST_DURATION="${TEST_DURATION:-300s}"
RAMP_UP_TIME="${RAMP_UP_TIME:-60s}"
RAMP_DOWN_TIME="${RAMP_DOWN_TIME:-60s}"

# Output configuration
OUTPUT_DIR="${OUTPUT_DIR:-./benchmarks}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_DIR="$OUTPUT_DIR/reports/$TIMESTAMP"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    local missing_deps=()
    
    # Check for required tools
    command -v k6 >/dev/null 2>&1 || missing_deps+=("k6")
    command -v psql >/dev/null 2>&1 || missing_deps+=("psql")
    command -v curl >/dev/null 2>&1 || missing_deps+=("curl")
    command -v jq >/dev/null 2>&1 || missing_deps+=("jq")
    command -v bc >/dev/null 2>&1 || missing_deps+=("bc")
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        log_info "Please install the missing dependencies and try again."
        exit 1
    fi
    
    log_success "All dependencies are available"
}

create_output_directories() {
    log_info "Creating output directories..."
    
    mkdir -p "$REPORT_DIR"
    mkdir -p "$OUTPUT_DIR/k6-scripts"
    mkdir -p "$OUTPUT_DIR/results"
    mkdir -p "$OUTPUT_DIR/baselines"
    
    log_success "Output directories created"
}

# ============================================================================
# BENCHMARK SCENARIOS
# ============================================================================

generate_k6_scripts() {
    log_info "Generating K6 benchmark scripts..."
    
    # User Registration Flow
    cat > "$OUTPUT_DIR/k6-scripts/user-registration.js" << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '60s', target: 50 },
    { duration: '300s', target: 100 },
    { duration: '60s', target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<150'],
    'http_req_failed': ['rate<0.01'],
    'errors': ['rate<0.01'],
  },
};

export default function() {
  const payload = JSON.stringify({
    email: `user${__VU}_${__ITER}@university.edu`,
    password: 'TestPassword123!',
    username: `user${__VU}_${__ITER}`,
    display_name: `Test User ${__VU}_${__ITER}`,
    university: 'Test University'
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = http.post(`${__ENV.API_BASE_URL}/auth/register`, payload, params);
  
  const success = check(response, {
    'registration status is 201': (r) => r.status === 201,
    'registration response time < 150ms': (r) => r.timings.duration < 150,
    'registration response has user id': (r) => r.json('user.id') !== undefined,
  });

  errorRate.add(!success);
  
  sleep(1);
}
EOF

    # Feed Loading Performance
    cat > "$OUTPUT_DIR/k6-scripts/feed-loading.js" << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '60s', target: 100 },
    { duration: '300s', target: 500 },
    { duration: '60s', target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<150'],
    'http_req_failed': ['rate<0.01'],
    'errors': ['rate<0.01'],
  },
};

export default function() {
  // Login first
  const loginPayload = JSON.stringify({
    email: `user${__VU}@university.edu`,
    password: 'TestPassword123!'
  });

  const loginResponse = http.post(`${__ENV.API_BASE_URL}/auth/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (loginResponse.status !== 200) {
    errorRate.add(true);
    return;
  }

  const token = loginResponse.json('token');
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Test feed loading
  const feedResponse = http.get(`${__ENV.API_BASE_URL}/feed/home?page=1&limit=20`, { headers });
  
  const success = check(feedResponse, {
    'feed status is 200': (r) => r.status === 200,
    'feed response time < 150ms': (r) => r.timings.duration < 150,
    'feed has posts': (r) => r.json('posts') !== undefined,
    'feed posts count > 0': (r) => r.json('posts').length > 0,
  });

  errorRate.add(!success);
  
  sleep(2);
}
EOF

    # Real-time Messaging Load
    cat > "$OUTPUT_DIR/k6-scripts/realtime-messaging.js" << 'EOF'
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '60s', target: 200 },
    { duration: '300s', target: 1000 },
    { duration: '60s', target: 0 },
  ],
  thresholds: {
    'ws_connecting': ['p(95)<100'],
    'ws_msgs_received': ['count>1000'],
    'errors': ['rate<0.01'],
  },
};

export default function() {
  const url = `${__ENV.WS_BASE_URL}/ws?token=test_token_${__VU}`;
  
  const res = ws.connect(url, {}, function (socket) {
    socket.on('open', () => {
      // Send a test message
      socket.send(JSON.stringify({
        type: 'message',
        content: `Test message from user ${__VU}`,
        conversation_id: 'test_conversation'
      }));
    });

    socket.on('message', (data) => {
      const message = JSON.parse(data);
      const success = check(message, {
        'message received': (m) => m.type === 'message',
        'message has content': (m) => m.content !== undefined,
      });
      errorRate.add(!success);
    });

    socket.on('error', (e) => {
      errorRate.add(true);
    });

    // Keep connection alive for 30 seconds
    sleep(30);
    socket.close();
  });

  check(res, {
    'websocket connection successful': (r) => r && r.status === 101,
  });
}
EOF

    # Search Functionality Stress Test
    cat > "$OUTPUT_DIR/k6-scripts/search-stress.js" << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '60s', target: 50 },
    { duration: '300s', target: 200 },
    { duration: '60s', target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<200'],
    'http_req_failed': ['rate<0.01'],
    'errors': ['rate<0.01'],
  },
};

export default function() {
  const headers = {
    'Authorization': `Bearer test_token_${__VU}`,
    'Content-Type': 'application/json',
  };

  const searchQueries = [
    'test',
    'university',
    'student',
    'post',
    'message',
    'user',
    'profile',
    'feed',
    'hashtag',
    'trending'
  ];

  const query = searchQueries[__VU % searchQueries.length];
  const searchType = ['users', 'posts', 'hashtags'][__VU % 3];

  const response = http.get(`${__ENV.API_BASE_URL}/search/${searchType}?q=${query}&page=1&limit=20`, { headers });
  
  const success = check(response, {
    'search status is 200': (r) => r.status === 200,
    'search response time < 200ms': (r) => r.timings.duration < 200,
    'search has results': (r) => r.json('results') !== undefined,
  });

  errorRate.add(!success);
  
  sleep(1);
}
EOF

    log_success "K6 benchmark scripts generated"
}

# ============================================================================
# DATABASE BENCHMARKING
# ============================================================================

benchmark_database() {
    log_info "Running database performance benchmarks..."
    
    local db_results="$REPORT_DIR/database-benchmark.json"
    
    # Test database connection
    log_info "Testing database connection..."
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
        log_error "Cannot connect to database"
        return 1
    fi
    
    # Run database performance tests
    cat > "$REPORT_DIR/db-benchmark.sql" << 'EOF'
-- Database Performance Benchmark Queries

-- Test 1: User feed query performance
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) 
SELECT p.*, u.username, up.profile_picture
FROM posts p
JOIN users u ON p.user_id = u.id
JOIN user_profiles up ON u.id = up.user_id
JOIN user_follows uf ON p.user_id = uf.following_id
WHERE uf.user_id = '00000000-0000-0000-0000-000000000001'
    AND p.deleted_at IS NULL
    AND p.visibility = 'public'
ORDER BY p.created_at DESC
LIMIT 20;

-- Test 2: Search query performance
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT p.*, u.username, ts_rank(p.content_vector, query) as rank
FROM posts p
JOIN users u ON p.user_id = u.id
CROSS JOIN plainto_tsquery('english', 'test search query') query
WHERE p.content_vector @@ query
ORDER BY rank DESC, p.created_at DESC
LIMIT 20;

-- Test 3: Message history query performance
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT m.*, u.username, up.profile_picture
FROM messages m
JOIN users u ON m.sender_id = u.id
JOIN user_profiles up ON u.id = up.user_id
WHERE m.conversation_id = '00000000-0000-0000-0000-000000000001'
    AND m.deleted_at IS NULL
ORDER BY m.created_at DESC
LIMIT 50;

-- Test 4: User search query performance
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT u.*, up.display_name, up.profile_picture
FROM users u
JOIN user_profiles up ON u.id = up.user_id
WHERE u.username ILIKE '%test%' 
    OR up.display_name ILIKE '%test%'
    OR up.bio ILIKE '%test%'
ORDER BY u.followers_count DESC
LIMIT 20;
EOF

    # Execute database benchmarks
    log_info "Executing database benchmark queries..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$REPORT_DIR/db-benchmark.sql" > "$REPORT_DIR/db-benchmark-results.txt" 2>&1
    
    # Parse results and create JSON report
    cat > "$REPORT_DIR/database-benchmark.json" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "database": {
    "host": "$DB_HOST",
    "port": "$DB_PORT",
    "name": "$DB_NAME"
  },
  "benchmarks": {
    "user_feed_query": {
      "status": "completed",
      "notes": "Check db-benchmark-results.txt for detailed execution plans"
    },
    "search_query": {
      "status": "completed",
      "notes": "Check db-benchmark-results.txt for detailed execution plans"
    },
    "message_history_query": {
      "status": "completed",
      "notes": "Check db-benchmark-results.txt for detailed execution plans"
    },
    "user_search_query": {
      "status": "completed",
      "notes": "Check db-benchmark-results.txt for detailed execution plans"
    }
  }
}
EOF

    log_success "Database benchmarks completed"
}

# ============================================================================
# API ENDPOINT BENCHMARKING
# ============================================================================

benchmark_api_endpoints() {
    log_info "Running API endpoint benchmarks..."
    
    local api_results="$REPORT_DIR/api-benchmark.json"
    
    # Test API health
    log_info "Testing API health..."
    local health_response=$(curl -s -w "%{http_code}" -o /dev/null "$API_BASE_URL/health")
    
    if [ "$health_response" != "200" ]; then
        log_error "API health check failed (HTTP $health_response)"
        return 1
    fi
    
    # Test individual endpoints
    local endpoints=(
        "GET:/auth/status"
        "GET:/users/me"
        "GET:/feed/home"
        "GET:/feed/explore"
        "GET:/search/users"
        "GET:/search/posts"
        "GET:/conversations"
        "GET:/notifications"
    )
    
    local results=()
    
    for endpoint in "${endpoints[@]}"; do
        local method=$(echo "$endpoint" | cut -d: -f1)
        local path=$(echo "$endpoint" | cut -d: -f2)
        local url="$API_BASE_URL$path"
        
        log_info "Testing $method $path..."
        
        local start_time=$(date +%s%N)
        local response=$(curl -s -w "%{http_code}" -o /dev/null "$url")
        local end_time=$(date +%s%N)
        local duration=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
        
        results+=("{\"method\":\"$method\",\"path\":\"$path\",\"status\":$response,\"duration_ms\":$duration}")
    done
    
    # Create API benchmark report
    cat > "$api_results" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "base_url": "$API_BASE_URL",
  "endpoints": [
    $(IFS=','; echo "${results[*]}")
  ]
}
EOF

    log_success "API endpoint benchmarks completed"
}

# ============================================================================
# LOAD TESTING
# ============================================================================

run_load_tests() {
    log_info "Running load tests..."
    
    local scenarios=(
        "user-registration"
        "feed-loading"
        "realtime-messaging"
        "search-stress"
    )
    
    for scenario in "${scenarios[@]}"; do
        log_info "Running $scenario load test..."
        
        local script_path="$OUTPUT_DIR/k6-scripts/$scenario.js"
        local result_path="$REPORT_DIR/$scenario-results.json"
        
        if [ -f "$script_path" ]; then
            k6 run --out json="$result_path" "$script_path"
            log_success "$scenario load test completed"
        else
            log_error "Script not found: $script_path"
        fi
    done
}

# ============================================================================
# PERFORMANCE ANALYSIS
# ============================================================================

analyze_performance() {
    log_info "Analyzing performance results..."
    
    local analysis_file="$REPORT_DIR/performance-analysis.json"
    
    # Analyze K6 results
    local k6_results=()
    for result_file in "$REPORT_DIR"/*-results.json; do
        if [ -f "$result_file" ]; then
            local scenario=$(basename "$result_file" -results.json)
            local metrics=$(jq -r '.metrics | to_entries[] | select(.key | test("(duration|failed|rate)")) | "\(.key): \(.value.values.p95 // .value.values.avg // .value.values.count)"' "$result_file" 2>/dev/null || echo "{}")
            k6_results+=("{\"scenario\":\"$scenario\",\"metrics\":$metrics}")
        fi
    done
    
    # Create performance analysis report
    cat > "$analysis_file" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "summary": {
    "total_scenarios": ${#k6_results[@]},
    "test_duration": "$TEST_DURATION",
    "concurrent_users": $CONCURRENT_USERS
  },
  "scenarios": [
    $(IFS=','; echo "${k6_results[*]}")
  ],
  "recommendations": [
    "Review slow endpoints and optimize database queries",
    "Consider implementing caching for frequently accessed data",
    "Monitor memory usage during high load",
    "Implement rate limiting to prevent abuse",
    "Consider horizontal scaling for high-traffic endpoints"
  ]
}
EOF

    log_success "Performance analysis completed"
}

# ============================================================================
# REPORT GENERATION
# ============================================================================

generate_report() {
    log_info "Generating performance report..."
    
    local report_file="$REPORT_DIR/performance-report.md"
    
    cat > "$report_file" << EOF
# ChitLaq M1 MVP Performance Benchmark Report

**Generated:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")  
**Test Duration:** $TEST_DURATION  
**Concurrent Users:** $CONCURRENT_USERS  
**Base URL:** $BASE_URL  

## Executive Summary

This report contains the results of comprehensive performance benchmarking for the ChitLaq M1 MVP social media platform.

## Test Configuration

- **API Base URL:** $API_BASE_URL
- **WebSocket Base URL:** $WS_BASE_URL
- **Database Host:** $DB_HOST:$DB_PORT
- **Test Duration:** $TEST_DURATION
- **Ramp Up Time:** $RAMP_UP_TIME
- **Ramp Down Time:** $RAMP_DOWN_TIME

## Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| API Response Time (p95) | < 150ms | TBD |
| WebSocket Latency (p95) | < 100ms | TBD |
| Database Query Time (p95) | < 50ms | TBD |
| Concurrent Users | 1000+ | TBD |
| Messages per Second | 50,000+ | TBD |
| Page Load Time | < 2s | TBD |
| Uptime | 99.9% | TBD |

## Test Results

### Load Test Results

EOF

    # Add K6 results to report
    for result_file in "$REPORT_DIR"/*-results.json; do
        if [ -f "$result_file" ]; then
            local scenario=$(basename "$result_file" -results.json)
            echo "#### $scenario" >> "$report_file"
            echo "" >> "$report_file"
            echo "| Metric | Value |" >> "$report_file"
            echo "|--------|-------|" >> "$report_file"
            
            # Extract key metrics
            local duration_p95=$(jq -r '.metrics.http_req_duration.values.p95 // "N/A"' "$result_file" 2>/dev/null)
            local failed_rate=$(jq -r '.metrics.http_req_failed.values.rate // "N/A"' "$result_file" 2>/dev/null)
            local requests_total=$(jq -r '.metrics.http_req_duration.values.count // "N/A"' "$result_file" 2>/dev/null)
            
            echo "| Duration (p95) | ${duration_p95}ms |" >> "$report_file"
            echo "| Failed Rate | ${failed_rate} |" >> "$report_file"
            echo "| Total Requests | ${requests_total} |" >> "$report_file"
            echo "" >> "$report_file"
        fi
    done

    cat >> "$report_file" << EOF

### Database Performance

Database benchmark results are available in:
- \`database-benchmark.json\` - Summary results
- \`db-benchmark-results.txt\` - Detailed execution plans

### API Endpoint Performance

API endpoint benchmark results are available in:
- \`api-benchmark.json\` - Individual endpoint performance

## Recommendations

1. **Optimize Slow Endpoints**: Review and optimize any endpoints exceeding performance targets
2. **Implement Caching**: Add Redis caching for frequently accessed data
3. **Database Optimization**: Review slow queries and add appropriate indexes
4. **Load Balancing**: Consider implementing load balancing for high-traffic scenarios
5. **Monitoring**: Implement comprehensive performance monitoring and alerting

## Next Steps

1. Review performance bottlenecks identified in this report
2. Implement optimizations for slow endpoints
3. Set up continuous performance monitoring
4. Schedule regular performance testing
5. Establish performance regression testing in CI/CD pipeline

---

*This report was generated automatically by the ChitLaq performance benchmarking system.*
EOF

    log_success "Performance report generated: $report_file"
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    log_info "Starting ChitLaq M1 MVP Performance Benchmarking"
    log_info "Timestamp: $TIMESTAMP"
    log_info "Report Directory: $REPORT_DIR"
    
    # Check dependencies
    check_dependencies
    
    # Create output directories
    create_output_directories
    
    # Generate K6 scripts
    generate_k6_scripts
    
    # Run benchmarks
    benchmark_database
    benchmark_api_endpoints
    run_load_tests
    
    # Analyze results
    analyze_performance
    
    # Generate report
    generate_report
    
    log_success "Performance benchmarking completed successfully!"
    log_info "Results available in: $REPORT_DIR"
    log_info "Main report: $REPORT_DIR/performance-report.md"
}

# ============================================================================
# COMMAND LINE INTERFACE
# ============================================================================

show_help() {
    cat << EOF
ChitLaq M1 MVP Performance Benchmarking Script

USAGE:
    $0 [OPTIONS]

OPTIONS:
    -h, --help              Show this help message
    -u, --url URL           Base URL for testing (default: http://localhost:3001)
    -c, --concurrent N      Number of concurrent users (default: 100)
    -d, --duration TIME     Test duration (default: 300s)
    -o, --output DIR        Output directory (default: ./benchmarks)
    --db-host HOST          Database host (default: localhost)
    --db-port PORT          Database port (default: 5432)
    --db-name NAME          Database name (default: chitlaq)
    --db-user USER          Database user (default: postgres)

EXAMPLES:
    $0 --url https://api.chitlaq.com --concurrent 500 --duration 600s
    $0 --db-host db.chitlaq.com --db-user chitlaq_user
    $0 --output /tmp/benchmarks

ENVIRONMENT VARIABLES:
    BASE_URL                Base URL for testing
    API_BASE_URL            API base URL
    WS_BASE_URL             WebSocket base URL
    DB_HOST                 Database host
    DB_PORT                 Database port
    DB_NAME                 Database name
    DB_USER                 Database user
    CONCURRENT_USERS        Number of concurrent users
    TEST_DURATION           Test duration
    OUTPUT_DIR              Output directory

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -u|--url)
            BASE_URL="$2"
            API_BASE_URL="$2/api"
            shift 2
            ;;
        -c|--concurrent)
            CONCURRENT_USERS="$2"
            shift 2
            ;;
        -d|--duration)
            TEST_DURATION="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --db-host)
            DB_HOST="$2"
            shift 2
            ;;
        --db-port)
            DB_PORT="$2"
            shift 2
            ;;
        --db-name)
            DB_NAME="$2"
            shift 2
            ;;
        --db-user)
            DB_USER="$2"
            shift 2
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Run main function
main "$@"
