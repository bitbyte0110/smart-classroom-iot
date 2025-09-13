#!/bin/bash
#=============================================================================
# Quick Setup Script for Grove LCD Dashboard
# Complete automation for new Raspberry Pi setup
#=============================================================================
# This script handles both Pi installation and dashboard deployment
#
# Usage:
#   ./quick_setup.sh PI_IP_ADDRESS
#   ./quick_setup.sh 192.168.202.221
#=============================================================================

set -e

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

header() {
    echo -e "${PURPLE}$1${NC}"
}

# Check arguments
if [ $# -eq 0 ]; then
    error "Usage: $0 <PI_IP_ADDRESS>"
fi

PI_IP="$1"

# Validate IP format (basic check)
if [[ ! $PI_IP =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
    error "Invalid IP address format: $PI_IP"
fi

echo ""
echo "==========================================================="
header "🚀 Grove LCD Dashboard - Complete Setup Automation"
echo "==========================================================="
echo ""
log "Target Raspberry Pi: $PI_IP"
echo ""

# Step 1: Test connection
header "📡 Step 1: Testing connection to Raspberry Pi"
echo "----------------------------------------"
if ping -c 1 -W 3 "$PI_IP" > /dev/null 2>&1; then
    success "Pi is reachable at $PI_IP"
else
    error "Cannot reach Raspberry Pi at $PI_IP. Check IP address and network connection."
fi
echo ""

# Step 2: Copy installation script to Pi
header "📥 Step 2: Copying installation script to Pi"
echo "----------------------------------------"
if [ ! -f "install_grove_lcd_dashboard.sh" ]; then
    error "Installation script 'install_grove_lcd_dashboard.sh' not found"
fi

log "Copying installation script..."
if scp install_grove_lcd_dashboard.sh "pi@$PI_IP:~/"; then
    success "Installation script copied"
else
    error "Failed to copy installation script"
fi
echo ""

# Step 3: Run installation on Pi
header "🔧 Step 3: Running installation on Raspberry Pi"
echo "----------------------------------------"
log "Starting remote installation..."
echo ""

if ssh "pi@$PI_IP" "chmod +x ~/install_grove_lcd_dashboard.sh && ~/install_grove_lcd_dashboard.sh"; then
    success "Installation completed on Pi"
else
    error "Installation failed on Pi"
fi
echo ""

# Step 4: Deploy dashboard
header "🚀 Step 4: Deploying LCD dashboard"
echo "----------------------------------------"
if [ ! -f "pi_lcd_dashboard_working.py" ]; then
    error "Dashboard file 'pi_lcd_dashboard_working.py' not found"
fi

log "Deploying dashboard file..."
if scp pi_lcd_dashboard_working.py "pi@$PI_IP:~/pi_lcd_dashboard.py"; then
    success "Dashboard deployed"
else
    error "Failed to deploy dashboard"
fi
echo ""

# Step 5: Final verification
header "✅ Step 5: Final verification"
echo "----------------------------------------"
log "Testing dashboard import on Pi..."
if ssh "pi@$PI_IP" "cd ~/GrovePi/Software/Python && source ~/grove-env/bin/activate && python3 -c 'import sys; sys.path.insert(0, \"/home/pi/GrovePi/Software/Python\"); from grove_rgb_lcd.grove_rgb_lcd import setText; print(\"✅ Dashboard ready!\")'"; then
    success "Dashboard verification passed"
else
    warning "Dashboard verification failed - may need manual troubleshooting"
fi
echo ""

# Step 6: Hardware reminder
header "🔌 Step 6: Hardware setup reminder"
echo "----------------------------------------"
warning "Don't forget to:"
echo "  1. Connect Grove 16x2 LCD to I2C port on Grove Base Hat"
echo "  2. Reboot the Pi: ssh pi@$PI_IP 'sudo reboot'"
echo "  3. Verify LCD connection: ssh pi@$PI_IP 'sudo i2cdetect -y 1'"
echo "     (Should show '3e' for LCD controller)"
echo ""

# Final instructions
echo ""
echo "==========================================================="
success "🎉 Complete setup finished!"
echo "==========================================================="
echo ""

log "📋 To start the dashboard:"
echo "  ssh pi@$PI_IP"
echo "  cd ~/GrovePi/Software/Python"
echo "  source ~/grove-env/bin/activate"
echo "  python3 ~/pi_lcd_dashboard.py"
echo ""

log "🔄 To check auto-start service:"
echo "  ssh pi@$PI_IP 'sudo systemctl status lcd-dashboard'"
echo ""

log "📊 To view live logs:"
echo "  ssh pi@$PI_IP 'sudo journalctl -u lcd-dashboard -f'"
echo ""

log "🛠️  For troubleshooting:"
echo "  See PI_LCD_SETUP_COMPLETE.md"
echo ""

success "Grove LCD Dashboard setup complete! 🚀"
