#!/bin/bash
# Premium Controlling Engine - Hetzner GEX44 Deployment Script
# 
# Usage: ./deploy.sh [setup|deploy|update|logs|status]

set -e

# Configuration
APP_NAME="controlling-engine"
APP_DIR="/opt/${APP_NAME}"
REPO_URL="https://github.com/YOUR_USERNAME/premium-controlling-engine.git"  # Update this!
DOMAIN="${DOMAIN:-controlling.yourdomain.com}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"; }
warn() { echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING:${NC} $1"; }
error() { echo -e "${RED}[$(date +'%H:%M:%S')] ERROR:${NC} $1"; exit 1; }

# ============================================
# INITIAL SETUP (run once on fresh server)
# ============================================
setup() {
    log "🚀 Setting up Hetzner GEX44 for Premium Controlling Engine..."
    
    # Update system
    log "Updating system packages..."
    apt-get update && apt-get upgrade -y
    
    # Install Docker
    if ! command -v docker &> /dev/null; then
        log "Installing Docker..."
        curl -fsSL https://get.docker.com | sh
        systemctl enable docker
        systemctl start docker
    else
        log "Docker already installed"
    fi
    
    # Install Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log "Installing Docker Compose..."
        curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
    else
        log "Docker Compose already installed"
    fi
    
    # Install useful tools
    log "Installing utilities..."
    apt-get install -y htop ncdu fail2ban ufw curl wget git
    
    # Configure firewall
    log "Configuring firewall..."
    ufw allow ssh
    ufw allow http
    ufw allow https
    ufw --force enable
    
    # Configure fail2ban
    log "Configuring fail2ban..."
    systemctl enable fail2ban
    systemctl start fail2ban
    
    # Create app directory
    log "Creating application directory..."
    mkdir -p ${APP_DIR}
    mkdir -p ${APP_DIR}/data
    mkdir -p ${APP_DIR}/uploads
    
    # Set permissions
    chown -R 1001:1001 ${APP_DIR}/data ${APP_DIR}/uploads
    
    log "✅ Setup complete! Run './deploy.sh deploy' to deploy the application."
}

# ============================================
# DEPLOY APPLICATION
# ============================================
deploy() {
    log "📦 Deploying Premium Controlling Engine..."
    
    cd ${APP_DIR}
    
    # Check for .env
    if [ ! -f .env ]; then
        warn ".env file not found!"
        log "Creating from template..."
        cp .env.example .env
        error "Please edit ${APP_DIR}/.env with your settings, then run deploy again."
    fi
    
    # Pull latest code (if using git)
    # git pull origin main
    
    # Build and start containers
    log "Building Docker images..."
    docker-compose build --no-cache
    
    log "Starting services..."
    docker-compose up -d
    
    # Wait for health check
    log "Waiting for application to start..."
    sleep 10
    
    # Check status
    if docker-compose ps | grep -q "Up"; then
        log "✅ Deployment successful!"
        log "🌐 Access at: http://${DOMAIN}:3000"
        docker-compose ps
    else
        error "Deployment failed! Check logs with: docker-compose logs"
    fi
}

# ============================================
# UPDATE APPLICATION
# ============================================
update() {
    log "🔄 Updating Premium Controlling Engine..."
    
    cd ${APP_DIR}
    
    # Pull latest code
    # git pull origin main
    
    # Rebuild and restart
    docker-compose down
    docker-compose build --no-cache
    docker-compose up -d
    
    log "✅ Update complete!"
}

# ============================================
# VIEW LOGS
# ============================================
logs() {
    cd ${APP_DIR}
    docker-compose logs -f --tail=100
}

# ============================================
# CHECK STATUS
# ============================================
status() {
    log "📊 Application Status"
    echo ""
    
    cd ${APP_DIR}
    
    # Docker status
    echo -e "${BLUE}=== Docker Containers ===${NC}"
    docker-compose ps
    echo ""
    
    # Resource usage
    echo -e "${BLUE}=== Resource Usage ===${NC}"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
    echo ""
    
    # Disk usage
    echo -e "${BLUE}=== Disk Usage ===${NC}"
    df -h ${APP_DIR}
    echo ""
    
    # Health check
    echo -e "${BLUE}=== Health Check ===${NC}"
    curl -s http://localhost:3000/api/health | jq . 2>/dev/null || echo "Health endpoint not responding"
}

# ============================================
# BACKUP
# ============================================
backup() {
    log "💾 Creating backup..."
    
    BACKUP_DIR="/backups/${APP_NAME}"
    BACKUP_FILE="${BACKUP_DIR}/backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    
    mkdir -p ${BACKUP_DIR}
    
    # Backup data directory
    tar -czf ${BACKUP_FILE} -C ${APP_DIR} data uploads .env
    
    log "✅ Backup created: ${BACKUP_FILE}"
    
    # Keep only last 7 backups
    ls -t ${BACKUP_DIR}/backup-*.tar.gz | tail -n +8 | xargs -r rm
    
    log "Backups available:"
    ls -lh ${BACKUP_DIR}/backup-*.tar.gz
}

# ============================================
# SSL SETUP (with Traefik)
# ============================================
ssl() {
    log "🔒 Setting up SSL with Traefik..."
    
    cd ${APP_DIR}
    
    # Start Traefik
    docker-compose --profile with-traefik up -d traefik
    
    log "✅ Traefik started! SSL certificates will be automatically obtained."
    log "🌐 Access at: https://${DOMAIN}"
}

# ============================================
# MAIN
# ============================================
case "$1" in
    setup)
        setup
        ;;
    deploy)
        deploy
        ;;
    update)
        update
        ;;
    logs)
        logs
        ;;
    status)
        status
        ;;
    backup)
        backup
        ;;
    ssl)
        ssl
        ;;
    *)
        echo "Premium Controlling Engine - Deployment Script"
        echo ""
        echo "Usage: $0 {setup|deploy|update|logs|status|backup|ssl}"
        echo ""
        echo "Commands:"
        echo "  setup   - Initial server setup (run once on fresh server)"
        echo "  deploy  - Deploy/redeploy the application"
        echo "  update  - Update to latest version"
        echo "  logs    - View application logs"
        echo "  status  - Check application status"
        echo "  backup  - Create backup of data"
        echo "  ssl     - Setup SSL with Traefik"
        echo ""
        exit 1
        ;;
esac
