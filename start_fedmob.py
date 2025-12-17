#!/usr/bin/env python3
"""
FedMob Complete System Startup Script
Starts both Flower Server and Client Server
"""

import subprocess
import sys
import os
import time
import signal
import logging
import socket
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class FedMobSystem:
    def __init__(self):
        self.flower_server_process = None
        self.client_server_process = None
        self.running = False
        
    def get_laptop_ip(self):
        """Get the laptop's IP address on the local network"""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                s.connect(("8.8.8.8", 80))
                local_ip = s.getsockname()[0]
            return local_ip
        except Exception as e:
            logger.error(f"Could not determine IP address: {e}")
            return "192.168.1.100"  # Fallback IP
    
    def check_dependencies(self):
        """Check if required dependencies are installed"""
        try:
            # Check flower-server dependencies
            flower_server_path = Path("flower-server")
            if not flower_server_path.exists():
                logger.error("flower-server directory not found")
                return False
                
            # Check client-server dependencies  
            client_server_path = Path("client-server")
            if not client_server_path.exists():
                logger.error("client-server directory not found")
                return False
                
            logger.info("✓ All directories found")
            return True
        except Exception as e:
            logger.error(f"Error checking dependencies: {e}")
            return False
    
    def start_flower_server(self):
        """Start the Flower server"""
        try:
            logger.info("🚀 Starting Flower Server...")
            
            # Change to flower-server directory
            flower_server_dir = Path("flower-server")
            os.chdir(flower_server_dir)
            
            # Start the server
            self.flower_server_process = subprocess.Popen(
                [sys.executable, "start_server.py"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            # Change back to root directory
            os.chdir("..")
            
            # Give it a moment to start
            time.sleep(3)
            
            if self.flower_server_process.poll() is None:
                logger.info("✓ Flower Server started successfully")
                return True
            else:
                logger.error("❌ Flower Server failed to start")
                return False
                
        except Exception as e:
            logger.error(f"Error starting Flower Server: {e}")
            return False
    
    def start_client_server(self):
        """Start the Client Server"""
        try:
            logger.info("🚀 Starting Client Server...")
            
            # Change to client-server directory
            client_server_dir = Path("client-server/src")
            os.chdir(client_server_dir)
            
            # Start the server
            self.client_server_process = subprocess.Popen(
                [sys.executable, "server.py"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            # Change back to root directory
            os.chdir("../..")
            
            # Give it a moment to start
            time.sleep(3)
            
            if self.client_server_process.poll() is None:
                logger.info("✓ Client Server started successfully")
                return True
            else:
                logger.error("❌ Client Server failed to start")
                return False
                
        except Exception as e:
            logger.error(f"Error starting Client Server: {e}")
            return False
    
    def stop_servers(self):
        """Stop both servers"""
        logger.info("🛑 Stopping servers...")
        
        if self.flower_server_process:
            self.flower_server_process.terminate()
            try:
                self.flower_server_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.flower_server_process.kill()
            logger.info("✓ Flower Server stopped")
            
        if self.client_server_process:
            self.client_server_process.terminate()
            try:
                self.client_server_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.client_server_process.kill()
            logger.info("✓ Client Server stopped")
    
    def display_instructions(self, server_ip):
        """Display connection instructions"""
        print("\n" + "="*80)
        print("🎯 FEDMOB SYSTEM STARTUP COMPLETE")
        print("="*80)
        print(f"📱 Server IP: {server_ip}")
        print(f"📱 Flower Server: {server_ip}:8080")
        print(f"📱 Client Server: {server_ip}:8082")
        print("\n📋 Mobile Device Setup:")
        print("1. Connect both phones to the same WiFi network as your laptop")
        print("2. Update the server address in your mobile app to:")
        print(f"   ws://{server_ip}:8082")
        print("3. Start the mobile app on both phones")
        print("4. The system will coordinate federated learning")
        print("\n⚠️  Note: Make sure your laptop firewall allows connections on ports 8080 and 8082")
        print("="*80)
        print("Press Ctrl+C to stop all servers")
        print("="*80)
    
    def run(self):
        """Run the complete system"""
        try:
            logger.info("🚀 Starting FedMob Complete System...")
            
            # Check dependencies
            if not self.check_dependencies():
                logger.error("❌ Dependency check failed")
                return False
            
            # Get server IP
            server_ip = self.get_laptop_ip()
            logger.info(f"📱 Server IP: {server_ip}")
            
            # Start Flower Server
            if not self.start_flower_server():
                logger.error("❌ Failed to start Flower Server")
                return False
            
            # Start Client Server
            if not self.start_client_server():
                logger.error("❌ Failed to start Client Server")
                self.stop_servers()
                return False
            
            # Display instructions
            self.display_instructions(server_ip)
            
            # Keep running until interrupted
            self.running = True
            while self.running:
                time.sleep(1)
                
        except KeyboardInterrupt:
            logger.info("🛑 Received interrupt signal")
        except Exception as e:
            logger.error(f"❌ System error: {e}")
        finally:
            self.stop_servers()
            logger.info("✅ FedMob system stopped")

def signal_handler(signum, frame):
    """Handle interrupt signals"""
    logger.info("🛑 Received interrupt signal")
    sys.exit(0)

def main():
    """Main entry point"""
    # Set up signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Create and run system
    system = FedMobSystem()
    system.run()

if __name__ == "__main__":
    main()