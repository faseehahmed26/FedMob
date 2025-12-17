#!/usr/bin/env python3
"""
Network Test Script for FedMob
Tests network connectivity and port availability
"""

import socket
import subprocess
import sys
import requests
import time

def get_laptop_ip():
    """Get the laptop's IP address"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
        return local_ip
    except Exception as e:
        print(f"❌ Could not determine IP address: {e}")
        return None

def test_port_availability(port):
    """Test if a port is available"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('0.0.0.0', port))
            return True
    except OSError:
        return False

def test_network_connectivity():
    """Test basic network connectivity"""
    try:
        response = requests.get('https://www.google.com', timeout=5)
        return response.status_code == 200
    except:
        return False

def test_firewall_ports(ip, ports):
    """Test if ports are accessible from external devices"""
    print(f"\n🔍 Testing firewall accessibility for {ip}...")
    
    for port in ports:
        try:
            # Try to connect to the port
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(2)
                result = s.connect_ex((ip, port))
                if result == 0:
                    print(f"✅ Port {port} is accessible")
                else:
                    print(f"❌ Port {port} is not accessible")
        except Exception as e:
            print(f"❌ Port {port} test failed: {e}")

def main():
    """Main test function"""
    print("🚀 FedMob Network Test")
    print("=" * 50)
    
    # Get laptop IP
    laptop_ip = get_laptop_ip()
    if not laptop_ip:
        print("❌ Could not determine laptop IP address")
        sys.exit(1)
    
    print(f"📱 Laptop IP Address: {laptop_ip}")
    
    # Test network connectivity
    print("\n🌐 Testing network connectivity...")
    if test_network_connectivity():
        print("✅ Internet connectivity: OK")
    else:
        print("❌ Internet connectivity: FAILED")
    
    # Test port availability
    print("\n🔌 Testing port availability...")
    ports_to_test = [8080, 8081]
    
    for port in ports_to_test:
        if test_port_availability(port):
            print(f"✅ Port {port}: Available")
        else:
            print(f"❌ Port {port}: Already in use")
    
    # Test firewall accessibility
    test_firewall_ports(laptop_ip, ports_to_test)
    
    # Display connection instructions
    print("\n" + "=" * 50)
    print("📋 CONNECTION INSTRUCTIONS")
    print("=" * 50)
    print(f"📱 Server Address: {laptop_ip}:8081 (with proxy)")
    print(f"📱 Direct Address: {laptop_ip}:8080 (without proxy)")
    print("\n📱 Mobile Device Setup:")
    print("1. Connect both phones to the same WiFi network")
    print("2. Update server address in mobile app to:")
    print(f"   {laptop_ip}:8081")
    print("3. Start the mobile app on both phones")
    print("4. The server will wait for 2 clients to connect")
    
    print("\n⚠️  TROUBLESHOOTING:")
    print("- If ports are not accessible, check your firewall settings")
    print("- Make sure all devices are on the same WiFi network")
    print("- Try using port 8080 if 8081 doesn't work")
    
    print("\n🎯 Next Steps:")
    print("1. Run: python start_with_proxy.py")
    print("2. Start mobile app on both phones")
    print("3. Test federated learning!")

if __name__ == "__main__":
    main()
