# FedMob Complete System Setup

This document provides complete instructions for setting up and running the FedMob federated learning system with the two-server architecture.

## System Architecture

```
Mobile Client (React Native + TF.js) ←→ Python Client Server ←→ Python Federated Server
```

### Components:
1. **Mobile Client** (`MobileClient/`) - React Native app with TensorFlow.js
2. **Client Server** (`client-server/`) - Python WebSocket server that bridges mobile clients
3. **Flower Server** (`flower-server/`) - Python Flower server for federated learning coordination

## Quick Start

### 1. Automated Setup (Recommended)
```bash
# Run the complete setup script
python setup_and_test.py
```

This script will:
- Check all dependencies
- Install required packages
- Start both servers
- Test connections
- Display connection instructions

### 2. Manual Setup

#### Step 1: Install Dependencies

**Flower Server:**
```bash
cd flower-server
pip install -r requirements.txt
```

**Client Server:**
```bash
cd client-server
pip install -r requirements.txt
```

**Mobile Client:**
```bash
cd MobileClient
npm install
```

#### Step 2: Start the Servers

**Terminal 1 - Flower Server:**
```bash
cd flower-server
python start_server.py
```

**Terminal 2 - Client Server:**
```bash
cd client-server/src
python server.py
```

#### Step 3: Configure Mobile Client

1. Find your laptop's IP address (displayed by the servers)
2. Update the server address in `MobileClient/src/App.jsx`:
   ```javascript
   const [serverAddress, setServerAddress] = useState('YOUR_LAPTOP_IP:8082');
   ```

#### Step 4: Start Mobile Client

```bash
cd MobileClient
npm start
# Then press 'i' for iOS or 'a' for Android
```

## Communication Flow

### 1. Mobile Client → Client Server
- **Protocol**: WebSocket
- **Port**: 8082
- **Messages**: Registration, training updates, weight transfers

### 2. Client Server → Flower Server
- **Protocol**: Flower gRPC
- **Port**: 8080
- **Messages**: Federated learning coordination

### 3. Data Flow
```
Mobile Client (TF.js weights) → Client Server (conversion) → Flower Server (aggregation) → Client Server (conversion) → Mobile Client (TF.js weights)
```

## Key Features

### Model Conversion
- **TF.js ↔ Python TF**: Automatic conversion between formats
- **Weight Serialization**: Base64 encoding for network transfer
- **Memory Optimization**: Efficient weight transfer

### Communication Protocols

#### Mobile Client Messages:
```json
{
  "type": "register",
  "client_id": "mobile_123"
}
```

```json
{
  "type": "training_update",
  "weights": [...],
  "metrics": {"loss": 0.5, "accuracy": 0.95}
}
```

#### Client Server Messages:
```json
{
  "type": "start_training",
  "round": 1,
  "config": {"epochs": "1", "batch_size": "32"}
}
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check if both servers are running
   - Verify firewall settings
   - Ensure correct IP addresses

2. **Mobile Client Can't Connect**
   - Verify server address format: `ws://IP:8082`
   - Check WiFi network connectivity
   - Ensure ports 8080 and 8082 are open

3. **Model Conversion Errors**
   - Check TensorFlow.js version compatibility
   - Verify weight format consistency
   - Monitor memory usage

### Debug Commands

**Check Server Status:**
```bash
# Check if ports are open
netstat -an | grep 8080
netstat -an | grep 8082
```

**Test WebSocket Connection:**
```bash
# Test client server WebSocket
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Key: test" -H "Sec-WebSocket-Version: 13" http://localhost:8082
```

## System Requirements

### Server (Laptop)
- Python 3.8+
- TensorFlow 2.10+
- Flower 1.5+
- WebSockets 10.4+
- 4GB+ RAM
- WiFi network access

### Mobile Client
- React Native 0.70+
- TensorFlow.js 4.0+
- iOS 12+ or Android 8+
- 2GB+ RAM
- WiFi network access

## Performance Optimization

### Memory Management
- Automatic cleanup of inactive clients
- Efficient weight serialization
- Resource monitoring and alerts

### Network Optimization
- Chunked weight transfers
- Compression for large models
- Connection pooling

### Training Optimization
- Incremental weight updates
- Progress tracking
- Error recovery mechanisms

## Monitoring and Logging

### Server Logs
- Client connections/disconnections
- Training progress
- Error messages
- Performance metrics

### Mobile Client Logs
- Connection status
- Training progress
- Memory usage
- Error handling

## Security Considerations

### Network Security
- Use HTTPS/WSS in production
- Implement authentication
- Validate client certificates

### Data Privacy
- Local training only
- No raw data transmission
- Secure weight aggregation

## Development

### Adding New Features
1. Update message handlers in `message_handler.py`
2. Add new message types to WebSocket client
3. Implement conversion logic in `model_converter.py`
4. Update mobile client UI

### Testing
```bash
# Run integration tests
python setup_and_test.py

# Test individual components
cd flower-server && python -m pytest
cd client-server && python -m pytest
```

## Production Deployment

### Docker Setup
```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Environment Variables
```bash
export FLOWER_SERVER_HOST=0.0.0.0
export FLOWER_SERVER_PORT=8080
export CLIENT_SERVER_HOST=0.0.0.0
export CLIENT_SERVER_PORT=8082
```

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review server logs
3. Test individual components
4. Verify network connectivity

## License

This project is part of the FedMob federated learning system for mobile devices.
