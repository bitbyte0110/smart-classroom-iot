#!/bin/bash
#=============================================================================
# Grove LCD Dashboard Automated Installation Script
# For Smart Classroom IoT Project
#=============================================================================
# This script automates the complete setup of Grove LCD dashboard on 
# fresh Raspberry Pi installations.
#
# Usage:
#   chmod +x install_grove_lcd_dashboard.sh
#   ./install_grove_lcd_dashboard.sh
#
# Or run directly:
#   curl -sSL https://raw.githubusercontent.com/YOUR_REPO/install_grove_lcd_dashboard.sh | bash
#=============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
GROVEPI_REPO="https://github.com/DexterInd/GrovePi"
PYTHON_VENV="grove-env"
SERVICE_NAME="lcd-dashboard"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should NOT be run as root. Run as regular user (pi)."
    fi
}

# Check if running on Raspberry Pi
check_raspberry_pi() {
    if ! grep -q "Raspberry Pi" /proc/cpuinfo 2>/dev/null; then
        warning "This doesn't appear to be a Raspberry Pi. Continue anyway? (y/N)"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            error "Installation cancelled."
        fi
    fi
}

# Update system packages
update_system() {
    log "Updating system packages..."
    sudo apt update && sudo apt upgrade -y
    success "System packages updated"
}

# Install required system packages
install_dependencies() {
    log "Installing system dependencies..."
    sudo apt install -y \
        git \
        python3-pip \
        python3-venv \
        python3-smbus \
        i2c-tools \
        mosquitto \
        mosquitto-clients
    success "System dependencies installed"
}

# Enable I2C and SSH
enable_interfaces() {
    log "Enabling I2C and SSH interfaces..."
    
    # Enable I2C
    if ! grep -q "^dtparam=i2c_arm=on" /boot/config.txt; then
        echo "dtparam=i2c_arm=on" | sudo tee -a /boot/config.txt > /dev/null
        success "I2C enabled in /boot/config.txt"
    else
        success "I2C already enabled"
    fi
    
    # Enable SSH
    sudo systemctl enable ssh
    sudo systemctl start ssh
    success "SSH enabled"
    
    # Add user to i2c group
    sudo usermod -a -G i2c $USER
    success "User added to i2c group"
}

# Install GrovePi library
install_grovepi() {
    log "Installing GrovePi library..."
    
    # Clone GrovePi repository
    if [ ! -d "$HOME/GrovePi" ]; then
        cd ~
        git clone $GROVEPI_REPO
        success "GrovePi repository cloned"
    else
        success "GrovePi repository already exists"
    fi
    
    # Install GrovePi library
    cd ~/GrovePi/Software/Python
    sudo python3 setup.py install
    
    # Fix package structure (crucial for imports)
    touch grove_rgb_lcd/__init__.py
    success "GrovePi library installed and package structure fixed"
}

# Create Python virtual environment
create_venv() {
    log "Creating Python virtual environment..."
    
    if [ ! -d "$HOME/$PYTHON_VENV" ]; then
        cd ~
        python3 -m venv $PYTHON_VENV
        success "Virtual environment created"
    else
        success "Virtual environment already exists"
    fi
    
    # Activate and install Python packages
    source ~/$PYTHON_VENV/bin/activate
    pip install --upgrade pip
    pip install paho-mqtt
    success "Python packages installed"
}

# Test I2C connection
test_i2c() {
    log "Testing I2C connection..."
    
    # Check if i2cdetect works
    if command -v i2cdetect >/dev/null 2>&1; then
        log "I2C tools available. Connect your Grove LCD and run 'sudo i2cdetect -y 1' to verify connection."
        success "I2C tools ready"
    else
        error "I2C tools not found"
    fi
}

# Test GrovePi library
test_grovepi() {
    log "Testing GrovePi library import..."
    
    cd ~/GrovePi/Software/Python
    
    # Test import
    if python3 -c "from grove_rgb_lcd.grove_rgb_lcd import setText, setRGB; print('GrovePi import successful')" 2>/dev/null; then
        success "GrovePi library working"
        return 0
    else
        error "GrovePi library import failed"
        return 1
    fi
}

# Download dashboard script
download_dashboard() {
    log "Setting up LCD dashboard script..."
    
    # Check if dashboard file exists locally
    if [ -f "pi_lcd_dashboard_working.py" ]; then
        cp pi_lcd_dashboard_working.py ~/pi_lcd_dashboard.py
        success "Dashboard script copied from local file"
    else
        warning "Dashboard script not found locally."
        log "Please copy pi_lcd_dashboard_working.py to the Pi manually using:"
        log "scp pi_lcd_dashboard_working.py pi@$(hostname -I | awk '{print $1}'):~/pi_lcd_dashboard.py"
    fi
}

# Create startup script
create_startup_script() {
    log "Creating startup script..."
    
    cat > ~/start_lcd_dashboard.sh << 'EOF'
#!/bin/bash
# LCD Dashboard Startup Script
cd /home/pi/GrovePi/Software/Python
source /home/pi/grove-env/bin/activate
python3 /home/pi/pi_lcd_dashboard.py
EOF
    
    chmod +x ~/start_lcd_dashboard.sh
    success "Startup script created"
}

# Create systemd service (optional)
create_service() {
    log "Do you want to enable auto-start on boot? (y/N)"
    read -r response
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        log "Creating systemd service..."
        
        sudo tee /etc/systemd/system/$SERVICE_NAME.service > /dev/null << EOF
[Unit]
Description=Smart Classroom LCD Dashboard
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/home/$USER/GrovePi/Software/Python
ExecStart=/home/$USER/start_lcd_dashboard.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
        
        sudo systemctl daemon-reload
        sudo systemctl enable $SERVICE_NAME.service
        success "Auto-start service created and enabled"
    else
        log "Skipping auto-start setup"
    fi
}

# Final test
final_test() {
    log "Running final tests..."
    
    # Test dashboard script exists
    if [ -f ~/pi_lcd_dashboard.py ]; then
        success "Dashboard script found"
    else
        warning "Dashboard script not found - copy it manually"
    fi
    
    # Test virtual environment
    if source ~/$PYTHON_VENV/bin/activate && python3 -c "import paho.mqtt.client; print('MQTT OK')" 2>/dev/null; then
        success "Python environment working"
    else
        error "Python environment test failed"
    fi
}

# Show completion message
show_completion() {
    echo ""
    echo "=================================="
    success "Installation completed successfully!"
    echo "=================================="
    echo ""
    log "📋 Next steps:"
    echo "  1. Reboot your Pi: sudo reboot"
    echo "  2. Connect Grove 16x2 LCD to I2C port on Grove Base Hat"
    echo "  3. Verify LCD connection: sudo i2cdetect -y 1 (should show '3e')"
    echo "  4. Copy dashboard script (if not done already):"
    echo "     scp pi_lcd_dashboard_working.py pi@$(hostname -I | awk '{print $1}'):~/pi_lcd_dashboard.py"
    echo ""
    log "🚀 To run the dashboard:"
    echo "  cd ~/GrovePi/Software/Python"
    echo "  source ~/grove-env/bin/activate"
    echo "  python3 ~/pi_lcd_dashboard.py"
    echo ""
    log "📊 To check service status (if enabled):"
    echo "  sudo systemctl status $SERVICE_NAME"
    echo ""
    log "🔧 For troubleshooting, see: PI_LCD_SETUP_COMPLETE.md"
    echo ""
}

# Main installation function
main() {
    echo ""
    echo "=================================================="
    echo "🚀 Grove LCD Dashboard Installation Script"
    echo "=================================================="
    echo ""
    
    check_root
    check_raspberry_pi
    
    log "Starting installation process..."
    
    update_system
    install_dependencies
    enable_interfaces
    install_grovepi
    create_venv
    test_i2c
    test_grovepi
    download_dashboard
    create_startup_script
    create_service
    final_test
    
    show_completion
}

# Run main function
main "$@"
