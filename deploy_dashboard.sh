#!/bin/bash
#=============================================================================
# Deploy Dashboard Script
# Copies the working dashboard file to Raspberry Pi
#=============================================================================
# Usage:
#   ./deploy_dashboard.sh PI_IP_ADDRESS
#   ./deploy_dashboard.sh 192.168.202.221
#=============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check arguments
if [ $# -eq 0 ]; then
    error "Usage: $0 <PI_IP_ADDRESS>"
fi

PI_IP="$1"
DASHBOARD_FILE="pi_lcd_dashboard_working.py"
TARGET_FILE="pi_lcd_dashboard.py"

# Check if dashboard file exists
if [ ! -f "$DASHBOARD_FILE" ]; then
    error "Dashboard file '$DASHBOARD_FILE' not found in current directory"
fi

# Validate IP format (basic check)
if [[ ! $PI_IP =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
    error "Invalid IP address format: $PI_IP"
fi

echo ""
echo "=================================================="
echo "🚀 Deploying Grove LCD Dashboard"
echo "=================================================="
echo ""

log "Source file: $DASHBOARD_FILE"
log "Target IP: $PI_IP"
log "Target file: ~/$TARGET_FILE"
echo ""

# Test connection to Pi
log "Testing connection to Raspberry Pi..."
if ping -c 1 -W 3 "$PI_IP" > /dev/null 2>&1; then
    success "Pi is reachable at $PI_IP"
else
    warning "Cannot ping $PI_IP - continuing anyway..."
fi

# Copy dashboard file
log "Copying dashboard file to Raspberry Pi..."
if scp "$DASHBOARD_FILE" "pi@$PI_IP:~/$TARGET_FILE"; then
    success "Dashboard file copied successfully"
else
    error "Failed to copy dashboard file"
fi

# Set executable permissions
log "Setting file permissions..."
if ssh "pi@$PI_IP" "chmod +x ~/$TARGET_FILE"; then
    success "File permissions set"
else
    warning "Could not set permissions (file may still work)"
fi

# Test dashboard import on Pi
log "Testing dashboard on Raspberry Pi..."
if ssh "pi@$PI_IP" "cd ~/GrovePi/Software/Python && source ~/grove-env/bin/activate && python3 -c 'import sys; sys.path.insert(0, \"/home/pi/GrovePi/Software/Python\"); from grove_rgb_lcd.grove_rgb_lcd import setText; print(\"Dashboard import test successful\")'"; then
    success "Dashboard import test passed"
else
    warning "Dashboard import test failed - check GrovePi installation"
fi

echo ""
echo "=================================="
success "Deployment completed!"
echo "=================================="
echo ""

log "📋 To run the dashboard on the Pi:"
echo "  ssh pi@$PI_IP"
echo "  cd ~/GrovePi/Software/Python"
echo "  source ~/grove-env/bin/activate"
echo "  python3 ~/pi_lcd_dashboard.py"
echo ""

log "🔧 To check if auto-start service is running:"
echo "  ssh pi@$PI_IP 'sudo systemctl status lcd-dashboard'"
echo ""

log "📊 To view dashboard logs:"
echo "  ssh pi@$PI_IP 'sudo journalctl -u lcd-dashboard -f'"
echo ""

success "Dashboard deployment complete! 🎉"
