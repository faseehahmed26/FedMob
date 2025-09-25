# FedMob Setup Instructions

## 🎯 Real Mobile Phone Federated Learning Test

This guide will help you set up a real federated learning system with your laptop as the server and 2 mobile phones as clients.

## 📋 Prerequisites

### Laptop Requirements:
- Python 3.8+
- Docker (for gRPC-Web proxy)
- Node.js 18+ (for mobile client)
- Both laptop and phones on the same WiFi network

### Mobile Requirements:
- 2 phones with React Native/Expo support
- Same WiFi network as laptop

## 🚀 Step-by-Step Setup

### 1. Laptop Server Setup

#### Install Python Dependencies:
```bash
cd flower-server
pip install -r requirements.txt
```

#### Get Your Laptop's IP Address:
```bash
# On macOS/Linux:
ifconfig | grep "inet " | grep -v 127.0.0.1

# On Windows:
ipconfig | findstr "IPv4"
```

#### Start the Server:
```bash
# Option 1: Simple server (direct gRPC)
python start_server.py

# Option 2: Server with gRPC-Web proxy (recommended)
python start_with_proxy.py
```

The server will display your laptop's IP address. Note this for the mobile clients.

### 2. Mobile Client Setup

#### Install Dependencies:
```bash
cd MobileClient
npm install
```

#### Update Server Address:
1. Open the mobile app
2. In the "Connection" section, update the server address to your laptop's IP
3. Format: `YOUR_LAPTOP_IP:8081` (with proxy) or `YOUR_LAPTOP_IP:8080` (without proxy)

#### Start the Mobile App:
```bash
# For Expo:
npx expo start

# For React Native CLI:
npx react-native run-android
# or
npx react-native run-ios
```

### 3. Network Configuration

#### Firewall Settings:
Make sure your laptop firewall allows connections on:
- Port 8080 (Flower server)
- Port 8081 (gRPC-Web proxy)

#### WiFi Network:
- Ensure all devices (laptop + 2 phones) are on the same WiFi network
- Avoid public WiFi networks (use home/office WiFi)

## 📱 Mobile App Usage

### Connection:
1. Open the FedMob app on both phones
2. Enter your laptop's IP address in the "Server Address" field
3. Tap "Connect to Server"
4. Wait for "Connected" status

### Federated Learning:
1. Once both phones are connected, tap "Start FL Training" on one phone
2. The server will coordinate training between both phones
3. Monitor the logs and metrics in real-time

## 🔧 Troubleshooting

### Connection Issues:
- **"Connection Failed"**: Check if server is running and IP address is correct
- **"Server not responding"**: Verify firewall settings and network connectivity
- **"gRPC-Web error"**: Try using direct gRPC (port 8080) instead of proxy (port 8081)

### Server Issues:
- **"No clients connected"**: Wait for both phones to connect before starting training
- **"Port already in use"**: Kill existing processes using ports 8080/8081

### Mobile App Issues:
- **App crashes**: Check console logs for JavaScript errors
- **TensorFlow errors**: Ensure TensorFlow.js is properly initialized

## 📊 Expected Behavior

### Successful Setup:
1. Laptop server shows "Waiting for 2 clients..."
2. Both phones show "Connected" status
3. Training starts when "Start FL Training" is pressed
4. Both phones participate in federated learning rounds
5. Metrics and logs update in real-time

### Training Process:
1. Server sends initial model parameters to both phones
2. Each phone trains on local data
3. Phones send updated parameters back to server
4. Server aggregates parameters using FedAvg
5. Process repeats for multiple rounds

## 🎯 Testing Scenarios

### Basic Test:
- Connect 2 phones to server
- Start federated learning
- Verify both phones participate in training

### Advanced Test:
- Test with different data on each phone
- Monitor parameter updates and aggregation
- Test reconnection after network interruption

## 📝 Notes

- The server will wait for exactly 2 clients before starting training
- Each training round includes 1 epoch on each phone
- Training data is synthetic MNIST data (different for each phone)
- All communication is logged for debugging

## 🆘 Support

If you encounter issues:
1. Check the server logs for error messages
2. Check the mobile app logs in the "Logs" section
3. Verify network connectivity between devices
4. Ensure all dependencies are properly installed
