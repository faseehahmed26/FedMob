# FedMob Python Client Server

Simple WebSocket server that acts as a bridge between mobile clients and the Flower federated learning server.

## Setup

1. Create and activate virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the Server

```bash
python src/server.py
```

The server will start on port 8082 by default.

## Protocol

### Client Registration
```json
// Client -> Server
{
    "type": "register",
    "client_id": "mobile_123"
}

// Server -> Client
{
    "type": "register_ack",
    "status": "success"
}
```

### Training Flow
```json
// Client -> Server (Start Training)
{
    "type": "start_training",
    "round": 1
}

// Client -> Server (Training Progress)
{
    "type": "training_update",
    "progress": 50
}

// Client -> Server (Update Weights)
{
    "type": "update_weights",
    "weights": [
        {
            "shape": [2, 2],
            "dtype": "float32",
            "data": "base64_encoded_data..."
        }
    ]
}

// Server -> Client (Weights Response)
{
    "type": "weights_received",
    "status": "success"  // or "error" with error message
}

// Client -> Server (Training Complete)
{
    "type": "training_complete",
    "metrics": {
        "loss": 0.5,
        "accuracy": 0.95
    }
}
```
