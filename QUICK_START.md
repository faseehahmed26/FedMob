# 🚀 FedMob Quick Start Guide

## Ready to Test with 2 Mobile Phones!

### Step 1: Start the Server (Laptop)
```bash
cd flower-server
python test_network.py  # Test network first
python start_with_proxy.py  # Start server with gRPC-Web proxy
```

**Note the IP address displayed** (e.g., `192.168.1.100`)

### Step 2: Start Mobile Apps (2 Phones)
```bash
cd MobileClient
npx expo start
```

**On each phone:**
1. Open the FedMob app
2. Enter server address: `YOUR_LAPTOP_IP:8081`
3. Tap "Connect to Server"
4. Wait for "Connected" status

### Step 3: Start Federated Learning
1. Once both phones show "Connected"
2. Tap "Start FL Training" on one phone
3. Watch both phones participate in training
4. Monitor logs and metrics

## 🎯 Expected Results

- **Server**: Shows "Waiting for 2 clients..." then starts training
- **Phone 1**: Connects, receives parameters, trains locally
- **Phone 2**: Connects, receives parameters, trains locally  
- **Both**: Send updated parameters back to server
- **Server**: Aggregates parameters using FedAvg
- **Process**: Repeats for 3 rounds

## 🔧 Troubleshooting

**Connection Issues:**
- Check if all devices are on same WiFi
- Verify laptop IP address is correct
- Try port 8080 instead of 8081

**Server Issues:**
- Make sure ports 8080/8081 are not in use
- Check firewall settings
- Run `python test_network.py` for diagnostics

**Mobile Issues:**
- Check console logs in Expo
- Verify TensorFlow.js initialization
- Try restarting the app

## 📱 Mobile App Features

- **Connection Status**: Real-time connection monitoring
- **Server Configuration**: Easy IP address setup
- **Training Control**: Start/stop federated learning
- **Live Metrics**: Training loss, accuracy, round progress
- **Logs**: Real-time debugging information

## 🎉 Success Indicators

✅ Both phones show "Connected" status  
✅ Server shows "2 clients connected"  
✅ Training starts when "Start FL Training" is pressed  
✅ Both phones show training progress  
✅ Metrics update in real-time  
✅ Training completes after 3 rounds  

## 📞 Need Help?

1. Check the detailed `SETUP_INSTRUCTIONS.md`
2. Run `python test_network.py` for network diagnostics
3. Check server and mobile app logs
4. Verify all devices are on the same WiFi network

**Happy Federated Learning! 🎯**
