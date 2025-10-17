#!/usr/bin/env python3
"""
FedMob Setup and Testing Script
Sets up the complete system and runs integration tests
"""

import subprocess
import sys
import os
import time
import logging
import socket
import json
import requests
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class FedMobTester:
    def __init__(self):
        self.flower_server_process = None
        self.client_server_process = None
        self.server_ip = None
        
    def get_laptop_ip(self):
        """Get the laptop's IP address"""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                s.connect(("8.8.8.8", 80))
                local_ip = s.getsockname()[0]
            return local_ip
        except Exception as e:
            logger.error(f"Could not determine IP address: {e}")
            return "192.168.1.100"
    
    def check_dependencies(self):
        """Check if all dependencies are installed"""
        logger.info("🔍 Checking dependencies...")
        
        # Check Python dependencies
        try:
            import flwr
            import tensorflow
            import websockets
            import numpy
            logger.info("✓ Python dependencies found")
        except ImportError as e:
            logger.error(f"❌ Missing Python dependencies: {e}")
            return False
            
        # Check directories
        required_dirs = ["flower-server", "client-server", "MobileClient"]
        for dir_name in required_dirs:
            if not Path(dir_name).exists():
                logger.error(f"❌ Missing directory: {dir_name}")
                return False
                
        logger.info("✓ All dependencies found")
        return True
    
    def install_dependencies(self):
        """Install required dependencies"""
        logger.info("📦 Installing dependencies...")
        
        # Install flower-server dependencies
        try:
            os.chdir("flower-server")
            subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], 
                         check=True, capture_output=True)
            logger.info("✓ Flower server dependencies installed")
        except subprocess.CalledProcessError as e:
            logger.error(f"❌ Failed to install flower-server dependencies: {e}")
            return False
        finally:
            os.chdir("..")
            
        # Install client-server dependencies
        try:
            os.chdir("client-server")
            subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], 
                         check=True, capture_output=True)
            logger.info("✓ Client server dependencies installed")
        except subprocess.CalledProcessError as e:
            logger.error(f"❌ Failed to install client-server dependencies: {e}")
            return False
        finally:
            os.chdir("..")
            
        return True
    
    def start_flower_server(self):
        """Start the Flower server"""
        logger.info("🚀 Starting Flower Server...")
        
        try:
            os.chdir("flower-server")
            self.flower_server_process = subprocess.Popen(
                [sys.executable, "start_server.py"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            os.chdir("..")
            
            # Wait for server to start
            time.sleep(5)
            
            if self.flower_server_process.poll() is None:
                logger.info("✓ Flower Server started successfully")
                return True
            else:
                logger.error("❌ Flower Server failed to start")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error starting Flower Server: {e}")
            return False
    
    def start_client_server(self):
        """Start the Client Server"""
        logger.info("🚀 Starting Client Server...")
        
        try:
            os.chdir("client-server/src")
            self.client_server_process = subprocess.Popen(
                [sys.executable, "server.py"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            os.chdir("../..")
            
            # Wait for server to start
            time.sleep(5)
            
            if self.client_server_process.poll() is None:
                logger.info("✓ Client Server started successfully")
                return True
            else:
                logger.error("❌ Client Server failed to start")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error starting Client Server: {e}")
            return False
    
    def test_servers(self):
        """Test if servers are responding"""
        logger.info("🧪 Testing server connections...")
        
        # Test Flower Server (port 8080)
        try:
            # Flower server doesn't have HTTP endpoints, so we just check if port is open
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            result = sock.connect_ex(('localhost', 8080))
            sock.close()
            
            if result == 0:
                logger.info("✓ Flower Server is listening on port 8080")
            else:
                logger.error("❌ Flower Server is not responding on port 8080")
                return False
        except Exception as e:
            logger.error(f"❌ Error testing Flower Server: {e}")
            return False
        
        # Test Client Server (port 8082)
        try:
            # Client server has WebSocket, so we check if port is open
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            result = sock.connect_ex(('localhost', 8082))
            sock.close()
            
            if result == 0:
                logger.info("✓ Client Server is listening on port 8082")
            else:
                logger.error("❌ Client Server is not responding on port 8082")
                return False
        except Exception as e:
            logger.error(f"❌ Error testing Client Server: {e}")
            return False
            
        return True
    
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
    
    def display_instructions(self):
        """Display setup instructions"""
        self.server_ip = self.get_laptop_ip()
        
        print("\n" + "="*80)
        print("🎯 FEDMOB SYSTEM SETUP COMPLETE")
        print("="*80)
        print(f"📱 Server IP: {self.server_ip}")
        print(f"📱 Flower Server: {self.server_ip}:8080")
        print(f"📱 Client Server: {self.server_ip}:8082")
        print("\n📋 Mobile Device Setup:")
        print("1. Connect both phones to the same WiFi network as your laptop")
        print("2. Update the server address in your mobile app to:")
        print(f"   ws://{self.server_ip}:8082")
        print("3. Start the mobile app on both phones")
        print("4. The system will coordinate federated learning")
        print("\n⚠️  Note: Make sure your laptop firewall allows connections on ports 8080 and 8082")
        print("="*80)
        print("Press Ctrl+C to stop all servers")
        print("="*80)
    
    def run_setup(self):
        """Run the complete setup and test"""
        try:
            logger.info("🚀 Starting FedMob Setup and Test...")
            
            # Check dependencies
            if not self.check_dependencies():
                logger.error("❌ Dependency check failed")
                return False
            
            # Install dependencies
            if not self.install_dependencies():
                logger.error("❌ Dependency installation failed")
                return False
            
            # Start Flower Server
            if not self.start_flower_server():
                logger.error("❌ Failed to start Flower Server")
                return False
            
            # Start Client Server
            if not self.start_client_server():
                logger.error("❌ Failed to start Client Server")
                self.stop_servers()
                return False
            
            # Test servers
            if not self.test_servers():
                logger.error("❌ Server tests failed")
                self.stop_servers()
                return False
            
            # Display instructions
            self.display_instructions()
            
            # Keep running until interrupted
            try:
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                logger.info("🛑 Received interrupt signal")
                
        except Exception as e:
            logger.error(f"❌ Setup error: {e}")
            return False
        finally:
            self.stop_servers()
            logger.info("✅ FedMob system stopped")
            
        return True

def main():
    """Main entry point"""
    tester = FedMobTester()
    success = tester.run_setup()
    
    if success:
        logger.info("✅ FedMob setup completed successfully!")
        sys.exit(0)
    else:
        logger.error("❌ FedMob setup failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
