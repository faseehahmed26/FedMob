# Federated Learning Lifecycle Changes

## Summary

Fixed the FL system to follow proper federated learning principles where training is user-controlled and server-coordinated, not automatic on connection.

## Changes Made

### 1. Client Server - Decoupled Registration from FL Start

**File**: `fedmob-project/client-server/src/server.py`

**Before**:
- Mobile connects → immediately creates Flower client
- Immediately connects Flower client to Flower server
- Training starts automatically when Flower server sees client

**After**:
- Mobile connects → only registers mobile client (no Flower client yet)
- Mobile client enters "ready" state
- Training only starts when user clicks "Start Training" button
- `start_training` message → creates Flower client → connects to Flower server

**Key Changes**:
- Modified `handle_client()`: Removed Flower client creation from registration
- Added `handle_training_start()`: Creates and starts Flower client when user requests training
- Added proper cleanup: Only removes Flower client if it exists

### 2. Client Manager - Added FL Session Tracking

**File**: `fedmob-project/client-server/src/client_manager.py`

**Added Fields**:
- `fl_session_active`: Tracks if Flower client is connected
- `state`: Tracks client state (`ready`, `fl_active`, `training`, `completed`)

**New Methods**:
- `start_fl_session()`: Marks client as having active FL session
- `end_fl_session()`: Ends FL session, returns to ready state

**State Flow**:
1. `ready`: Connected but no FL session
2. `fl_active`: Flower client connected, waiting for rounds
3. `training`: Currently training in a round
4. `fl_active`: Back to active after round completes
5. `ready`: FL session ended

### 3. Mobile Client - Already Correct

**Files**: `MobileClient/src/federated/FlowerClient.js`, `WebSocketClient.js`

**Current Flow** (already correct):
1. User clicks "Start Training" → calls `client.startTraining(round)`
2. Sends `start_training` message to server
3. Waits for server to send `start_training` with weights
4. `onTrainingStart` handler trains locally
5. Sends `training_complete` back

## Correct FL Flow Now

### Step 0: Connection
1. Mobile app starts
2. User clicks "Connect to Server"
3. Mobile sends `register` message
4. Server registers mobile client in "ready" state
5. Server sends `register_ack` with "Connected. Click 'Start Training' to begin."

### Step 1: Training Initiation (User-Controlled)
1. User clicks "Start Training" button
2. Mobile sends `start_training` message
3. Server receives message → creates Flower client
4. Server connects Flower client to Flower server
5. Server updates client state to "fl_active"
6. Server sends `training_session_started` to mobile

### Step 2: Flower Server Distributes Model
1. Flower server sees new client available
2. Flower server calls `get_parameters()` to get initial weights
3. Flower server calls `fit()` with parameters and config
4. Client server converts parameters to TF.js format
5. Client server sends `start_training` message to mobile with weights

### Step 3: Local Training
1. Mobile receives `start_training` with round number and weights
2. `onTrainingStart` handler triggers
3. Mobile applies received weights to model
4. Mobile trains model locally on device data
5. Mobile serializes updated weights

### Step 4: Return Updates
1. Mobile sends `training_complete` with weights, num_samples, metrics
2. Client server receives and forwards to Flower client
3. Flower client returns `FitRes` to Flower server

### Step 5: Server Aggregates
1. Flower server aggregates weights using FedAvg
2. Flower server evaluates aggregated model
3. If more rounds: Flower server calls `fit()` again with aggregated weights
4. If done: Training completes

## Testing Instructions

### Start Services

**Terminal 1 - Flower Server**:
```bash
cd fedmob-project/flower-server
source venv/bin/activate
python server.py
```

**Terminal 2 - Client Server**:
```bash
cd fedmob-project/client-server
source venv/bin/activate
python src/server.py
```

**Terminal 3 - Mobile Client**:
```bash
cd fedmob-project/MobileClient
npx expo start
```

### Test Flow

1. **Connect**: Open mobile app, click "Connect to Server"
   - Expected: "Connected. Click 'Start Training' to begin."
   - Server logs: "Client X registered and ready", "Client X is now in 'ready' state"
   - No Flower client created yet ✅

2. **Start Training**: Click "Start FL Training" button
   - Expected: "FL session started. Waiting for server to send training instructions..."
   - Server logs: "User requested training start", "Creating Flower client", "Connecting Flower client to Flower server"
   - Flower client connects NOW ✅

3. **Training Begins**: Flower server sends training instruction
   - Expected: "Starting round 1" on mobile
   - Server logs: "fit() CALLED by Flower framework"
   - Mobile trains locally ✅

4. **Complete Round**: Mobile finishes training
   - Expected: "Completed round 1", metrics displayed
   - Server logs: "Training completed", "Aggregated weights from X clients"
   - Flower server aggregates weights ✅

5. **Next Round**: Flower server starts next round automatically
   - Expected: "Starting round 2" on mobile
   - Same flow as round 1 ✅

## Key Benefits

1. **User Control**: Training only starts when user explicitly requests it
2. **FL Principles**: Follows proper federated learning workflow
3. **Resource Efficiency**: Flower client only created when needed
4. **Clear States**: Easy to track client lifecycle (ready → fl_active → training)
5. **Multiple Sessions**: Client can connect once, train multiple times

## Log Messages

### On Connection
```
🔌 [SERVER] Client mobile_XXX connected
✅ [SERVER] Client mobile_XXX registered and ready
📱 [SERVER] Client mobile_XXX is now in 'ready' state - waiting for training start
```

### On Training Start (User Clicks Button)
```
🚀 [SERVER] User requested training start for mobile_XXX
🎯 [SERVER] Initializing FL session for mobile_XXX
🌸 [SERVER] Creating Flower client for mobile_XXX
✅ [SERVER] Flower client created for mobile_XXX
🔗 [SERVER] Connecting Flower client to Flower server...
✅ [SERVER] Flower client connected to Flower server for mobile_XXX
🏋️ [SERVER] FL session active - Flower server will coordinate training rounds
```

### On Disconnect
```
🔌 [SERVER] Cleaning up client mobile_XXX
🌸 [SERVER] Cleaning up Flower client for mobile_XXX
✅ [SERVER] Client mobile_XXX disconnected
```

OR (if user never started training):
```
🔌 [SERVER] Cleaning up client mobile_XXX
📱 [SERVER] No Flower client to clean up for mobile_XXX (was in ready state only)
✅ [SERVER] Client mobile_XXX disconnected
```

## Files Modified

1. `/fedmob-project/client-server/src/server.py`
   - Decoupled registration from FL start
   - Added `handle_training_start()` method
   - Updated cleanup logic

2. `/fedmob-project/client-server/src/client_manager.py`
   - Added `fl_session_active` and `state` fields
   - Added `start_fl_session()` and `end_fl_session()` methods
   - Updated state transitions

## Files Verified (No Changes Needed)

1. `/fedmob-project/MobileClient/src/federated/FlowerClient.js`
   - Already sends `start_training` on user button click ✅
   - Already waits for server's `start_training` message to train ✅

2. `/fedmob-project/MobileClient/src/federated/WebSocketClient.js`
   - `startTraining()` sends correct message ✅
   - `onTrainingStart` handler correctly receives server instructions ✅

## Status: ✅ Complete

The system now follows proper federated learning principles:
- Clients connect and register first
- Training is user-initiated and server-coordinated
- Flower framework coordinates training rounds
- FedAvg aggregation works correctly
- Weight transfer flows properly in both directions

