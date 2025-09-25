#!/usr/bin/env python3
"""
FedMob Flower Server Startup Script
Automatically detects laptop IP and starts server for mobile device access
"""

import socket
import subprocess
import sys
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_laptop_ip():
    """Get the laptop's IP address on the local network"""
    try:
        # Connect to a remote address to determine local IP
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
        return local_ip
    except Exception as e:
        logger.error(f"Could not determine IP address: {e}")
        return "192.168.1.100"  # Fallback IP

def update_client_config(server_ip):
    """Update client configuration with the actual server IP"""
    config_file = "config.py"
    
    try:
        with open(config_file, 'r') as f:
            content = f.read()
        
        # Replace the placeholder IP with actual IP
        updated_content = content.replace(
            'SERVER_HOST = "192.168.1.100"',
            f'SERVER_HOST = "{server_ip}"'
        )
        
        with open(config_file, 'w') as f:
            f.write(updated_content)
        
        logger.info(f"Updated client config with server IP: {server_ip}")
    except Exception as e:
        logger.error(f"Could not update config file: {e}")

def check_dependencies():
    """Check if required dependencies are installed"""
    try:
        import flwr
        import numpy
        logger.info("✓ Flower dependencies found")
        return True
    except ImportError as e:
        logger.error(f"Missing dependencies: {e}")
        logger.error("Please run: pip install -r requirements.txt")
        return False

def main():
    """Main startup function"""
    logger.info("🚀 Starting FedMob Flower Server...")
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    # Get laptop IP address
    server_ip = get_laptop_ip()
    logger.info(f"📱 Laptop IP address: {server_ip}")
    logger.info(f"📱 Mobile devices should connect to: {server_ip}:8080")
    
    # Update client configuration
    update_client_config(server_ip)
    
    # Display connection instructions
    print("\n" + "="*60)
    print("🎯 FEDMOB SERVER STARTUP INSTRUCTIONS")
    print("="*60)
    print(f"📱 Server IP: {server_ip}")
    print(f"📱 Port: 8080")
    print(f"📱 Full Address: {server_ip}:8080")
    print("\n📋 Mobile Device Setup:")
    print("1. Connect both phones to the same WiFi network as your laptop")
    print("2. Update the server address in your mobile app to:")
    print(f"   {server_ip}:8080")
    print("3. Start the mobile app on both phones")
    print("4. The server will wait for 2 clients to connect")
    print("\n⚠️  Note: Make sure your laptop firewall allows connections on port 8080")
    print("="*60)
    
    # Start the server
    logger.info("Starting Flower server...")
    try:
        # Import and run the server
        from server import main as server_main
        server_main()
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
