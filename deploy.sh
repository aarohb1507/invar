#!/bin/bash

# Invar Docker Compose Deployment Helper
# Quick commands for common deployment tasks

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_header() {
  echo -e "\n${GREEN}▶ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

# Check if docker-compose exists
if ! command -v docker-compose &> /dev/null; then
  print_error "docker-compose not found. Please install it first."
  exit 1
fi

# Main menu
case "${1:-help}" in
  setup)
    print_header "Setting up Invar for Docker deployment"
    
    if [ ! -f .env.production ]; then
      print_warning ".env.production not found"
      cp .env.production.example .env.production
      print_success "Created .env.production from template"
      print_warning "⚠️  IMPORTANT: Edit .env.production and set strong passwords!"
      echo "   → POSTGRES_PASSWORD"
      echo "   → INVAR_API_KEY (or generate: openssl rand -base64 32)"
    else
      print_success ".env.production already exists"
    fi
    ;;
    
  build)
    print_header "Building Docker images"
    docker-compose build
    print_success "Build complete"
    ;;
    
  start)
    print_header "Starting services"
    docker-compose up -d
    sleep 3
    docker-compose ps
    print_success "Services started"
    ;;
    
  stop)
    print_header "Stopping services"
    docker-compose down
    print_success "Services stopped"
    ;;
    
  restart)
    print_header "Restarting services"
    docker-compose restart
    print_success "Services restarted"
    ;;
    
  logs)
    print_header "Tailing logs (Ctrl+C to exit)"
    docker-compose logs -f
    ;;
    
  status)
    print_header "Service Status"
    docker-compose ps
    ;;
    
  health)
    print_header "Health Check"
    if curl -s http://localhost:3000/health > /dev/null; then
      print_success "App is healthy"
    else
      print_error "App is not responding"
      exit 1
    fi
    ;;
    
  test)
    print_header "Sending test metric"
    API_KEY=$(grep INVAR_API_KEY .env.production | cut -d= -f2 | tr -d ' ')
    TIMESTAMP=$(date +%s)
    
    curl -X POST http://localhost:3000/v1/ingest \
      -H "Content-Type: application/json" \
      -H "X-API-Key: $API_KEY" \
      -d "{
        \"metric\": \"cpu\",
        \"value\": $((RANDOM % 100)),
        \"server\": \"test-server\",
        \"timestamp\": $TIMESTAMP
      }"
    print_success "Test metric sent"
    ;;
    
  clean)
    print_header "Removing volumes and data (⚠️  DESTRUCTIVE)"
    read -p "Type 'yes' to confirm: " confirm
    if [ "$confirm" = "yes" ]; then
      docker-compose down -v
      print_success "All volumes removed"
    else
      print_error "Cancelled"
    fi
    ;;
    
  deploy)
    print_header "Full deployment pipeline"
    bash $0 setup
    bash $0 build
    bash $0 start
    print_success "✓ Deployment complete!"
    print_header "Next steps:"
    echo "1. Check services: bash $0 status"
    echo "2. View logs: bash $0 logs"
    echo "3. Test: bash $0 test"
    echo "4. Dashboard: http://localhost:3000"
    ;;
    
  *)
    echo -e "${GREEN}Invar Docker Compose Helper${NC}\n"
    echo "Usage: bash deploy.sh [command]"
    echo ""
    echo "Commands:"
    echo "  setup      - Create .env.production from template"
    echo "  build      - Build Docker images"
    echo "  start      - Start all services"
    echo "  stop       - Stop services"
    echo "  restart    - Restart services"
    echo "  status     - Show service status"
    echo "  logs       - Follow service logs"
    echo "  health     - Check app health"
    echo "  test       - Send test metric"
    echo "  clean      - Remove all volumes (⚠️  deletes data)"
    echo "  deploy     - Full setup + build + start"
    echo ""
    echo "Examples:"
    echo "  bash deploy.sh deploy     # Full deployment"
    echo "  bash deploy.sh logs       # Follow logs"
    echo "  bash deploy.sh health     # Check if app is running"
    ;;
esac
