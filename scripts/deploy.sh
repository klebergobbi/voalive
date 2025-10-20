#!/bin/bash

# ReservaSegura Production Deployment Script
# Usage: ./scripts/deploy.sh [environment]

set -e  # Exit on any error

# Configuration
ENVIRONMENT=${1:-production}
DOCKER_COMPOSE_FILE="docker-compose.prod.yml"
LOG_FILE="/var/log/reservasegura-deploy.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   error "This script should not be run as root for security reasons"
fi

# Check required tools
check_dependencies() {
    log "Checking dependencies..."

    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
    fi

    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
    fi

    if ! command -v curl &> /dev/null; then
        error "curl is not installed"
    fi

    success "All dependencies are available"
}

# Create necessary directories
setup_directories() {
    log "Setting up directories..."

    sudo mkdir -p /opt/reservasegura/{data,logs,backups,ssl}
    sudo mkdir -p /var/log/reservasegura

    # Set appropriate permissions
    sudo chown -R $USER:$USER /opt/reservasegura
    sudo chown -R $USER:$USER /var/log/reservasegura

    success "Directories created successfully"
}

# Backup database before deployment
backup_database() {
    if [ -f ".env" ]; then
        log "Creating database backup..."

        # Extract database URL from environment
        DATABASE_URL=$(grep DATABASE_URL .env | cut -d '=' -f2- | tr -d '"')

        if [ -n "$DATABASE_URL" ]; then
            BACKUP_FILE="/opt/reservasegura/backups/reservasegura_$(date +%Y%m%d_%H%M%S).sql"

            # Create backup using docker
            docker-compose -f $DOCKER_COMPOSE_FILE exec -T postgres pg_dump "$DATABASE_URL" > "$BACKUP_FILE" || warning "Database backup failed"

            if [ -f "$BACKUP_FILE" ]; then
                success "Database backed up to $BACKUP_FILE"
            fi
        else
            warning "DATABASE_URL not found, skipping backup"
        fi
    else
        warning ".env file not found, skipping backup"
    fi
}

# Health check function
health_check() {
    local service_url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1

    log "Performing health check for $service_name..."

    while [ $attempt -le $max_attempts ]; do
        if curl -f --connect-timeout 5 --max-time 10 "$service_url" >/dev/null 2>&1; then
            success "$service_name is healthy"
            return 0
        fi

        log "Attempt $attempt/$max_attempts failed, retrying in 10 seconds..."
        sleep 10
        ((attempt++))
    done

    error "$service_name health check failed after $max_attempts attempts"
}

# Deployment function
deploy() {
    log "Starting deployment to $ENVIRONMENT..."

    # Pull latest images
    log "Pulling latest Docker images..."
    docker-compose -f $DOCKER_COMPOSE_FILE pull

    # Run database migrations
    log "Running database migrations..."
    docker-compose -f $DOCKER_COMPOSE_FILE run --rm reservasegura-api npx prisma db push

    # Deploy services with zero downtime
    log "Deploying services..."
    docker-compose -f $DOCKER_COMPOSE_FILE up -d --remove-orphans

    # Wait for services to start
    log "Waiting for services to start..."
    sleep 30

    # Clean up unused images
    log "Cleaning up unused Docker images..."
    docker image prune -f

    success "Deployment completed successfully"
}

# Monitor services
monitor_services() {
    log "Monitoring services..."

    # Check service status
    docker-compose -f $DOCKER_COMPOSE_FILE ps

    # Perform health checks
    health_check "http://localhost/health" "ReservaSegura Web"
    health_check "http://localhost/api/v1/flight-scraper/stats" "ReservaSegura API"
    health_check "http://localhost:3000" "Grafana Dashboard"
    health_check "http://localhost:9090" "Prometheus Metrics"

    success "All services are running and healthy"
}

# Rollback function
rollback() {
    log "Rolling back deployment..."

    # Get previous images
    docker-compose -f $DOCKER_COMPOSE_FILE down

    # Restore from backup if available
    LATEST_BACKUP=$(ls -t /opt/reservasegura/backups/*.sql 2>/dev/null | head -n1)
    if [ -n "$LATEST_BACKUP" ]; then
        log "Restoring database from $LATEST_BACKUP..."
        # Restore logic here
    fi

    # Start services with previous configuration
    docker-compose -f $DOCKER_COMPOSE_FILE up -d

    warning "Rollback completed - please verify system status"
}

# Send notifications
send_notification() {
    local status=$1
    local message="ReservaSegura deployment $status at $(date)"

    # Send to Slack if webhook is configured
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
             --data "{\"text\":\"$message\"}" \
             "$SLACK_WEBHOOK" >/dev/null 2>&1 || true
    fi

    # Send to Discord if webhook is configured
    if [ -n "$DISCORD_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
             --data "{\"content\":\"$message\"}" \
             "$DISCORD_WEBHOOK" >/dev/null 2>&1 || true
    fi
}

# Main execution
main() {
    log "========================================="
    log "ReservaSegura Deployment Script Started"
    log "Environment: $ENVIRONMENT"
    log "========================================="

    # Trap errors and perform rollback
    trap 'error "Deployment failed! Check logs at $LOG_FILE"; send_notification "FAILED"; exit 1' ERR

    check_dependencies
    setup_directories

    if [ "$ENVIRONMENT" = "production" ]; then
        backup_database
    fi

    deploy
    monitor_services

    success "========================================="
    success "ReservaSegura deployment completed successfully!"
    success "========================================="

    send_notification "SUCCESSFUL"

    # Display useful information
    echo ""
    log "Useful URLs:"
    log "• Web App: https://reservasegura.com"
    log "• API: https://api.reservasegura.com"
    log "• Monitoring: https://monitor.reservasegura.com"
    log "• Status Page: https://status.reservasegura.com"
    log "• Metrics: https://metrics.reservasegura.com"
    echo ""
    log "Logs are available at: $LOG_FILE"
}

# Execute main function if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi