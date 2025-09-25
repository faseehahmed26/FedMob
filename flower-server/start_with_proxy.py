#!/usr/bin/env python3
"""
FedMob Flower Server with gRPC-Web Proxy
Starts both the Flower server and Envoy proxy for mobile device access
"""

import socket
import subprocess
import sys
import os
import logging
import time
import threading
import signal

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_laptop_ip():
    """Get the laptop's IP address on the local network"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
        return local_ip
    except Exception as e:
        logger.error(f"Could not determine IP address: {e}")
        return "192.168.1.100"

def check_docker():
    """Check if Docker is available"""
    try:
        result = subprocess.run(['docker', '--version'], 
                              capture_output=True, text=True, check=True)
        logger.info(f"✓ Docker found: {result.stdout.strip()}")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        logger.error("❌ Docker not found. Please install Docker to use gRPC-Web proxy.")
        return False

def start_envoy_proxy():
    """Start Envoy proxy using Docker Compose"""
    try:
        logger.info("🚀 Starting Envoy gRPC-Web proxy...")
        subprocess.run(['docker-compose', 'up', '-d'], check=True)
        logger.info("✓ Envoy proxy started on port 8081")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ Failed to start Envoy proxy: {e}")
        return False

def stop_envoy_proxy():
    """Stop Envoy proxy"""
    try:
        subprocess.run(['docker-compose', 'down'], check=True)
        logger.info("✓ Envoy proxy stopped")
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ Failed to stop Envoy proxy: {e}")

def start_flower_server():
    """Start the Flower server"""
    try:
        logger.info("🚀 Starting Flower server...")
        from server import main as server_main
        server_main()
    except Exception as e:
        logger.error(f"❌ Flower server error: {e}")
        raise

def signal_handler(signum, frame):
    """Handle shutdown signals"""
    logger.info("\n🛑 Shutting down...")
    stop_envoy_proxy()
    sys.exit(0)

def main():
    """Main startup function"""
    logger.info("🚀 Starting FedMob Flower Server with gRPC-Web Proxy...")
    
    # Set up signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Get laptop IP
    server_ip = get_laptop_ip()
    logger.info(f"📱 Laptop IP address: {server_ip}")
    
    # Check Docker
    if not check_docker():
        logger.info("💡 Alternative: Run server without proxy (direct gRPC)")
        logger.info("   This will work for testing but may have CORS issues")
        choice = input("Continue without proxy? (y/n): ")
        if choice.lower() != 'y':
            sys.exit(1)
        start_flower_server()
        return
    
    # Start Envoy proxy
    if not start_envoy_proxy():
        logger.error("❌ Could not start Envoy proxy. Exiting.")
        sys.exit(1)
    
    # Display connection instructions
    print("\n" + "="*70)
    print("🎯 FEDMOB SERVER WITH gRPC-Web PROXY")
    print("="*70)
    print(f"📱 Server IP: {server_ip}")
    print(f"📱 gRPC-Web Port: 8081 (for mobile clients)")
    print(f"📱 Direct gRPC Port: 8080 (for testing)")
    print(f"📱 Mobile Address: {server_ip}:8081")
    print("\n📋 Mobile Device Setup:")
    print("1. Connect both phones to the same WiFi network as your laptop")
    print("2. Update the server address in your mobile app to:")
    print(f"   {server_ip}:8081")
    print("3. Start the mobile app on both phones")
    print("4. The server will wait for 2 clients to connect")
    print("\n⚠️  Note: Make sure your laptop firewall allows connections on ports 8080 and 8081")
    print("="*70)
    
    try:
        # Start Flower server
        start_flower_server()
    except KeyboardInterrupt:
        logger.info("🛑 Server stopped by user")
    finally:
        stop_envoy_proxy()

if __name__ == "__main__":
    main()
