#!/usr/bin/env python3
"""
Test script to verify FedMob connection flow
"""

import asyncio
import websockets
import json
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_mobile_client_connection():
    """Test mobile client connection to client-server"""
    try:
        # Connect to client-server WebSocket
        uri = "ws://10.118.29.192:8082"
        logger.info(f"Connecting to {uri}...")
        
        async with websockets.connect(uri) as websocket:
            # Send registration message
            register_msg = {
                "type": "register",
                "client_id": f"test_mobile_{int(time.time())}"
            }
            
            await websocket.send(json.dumps(register_msg))
            logger.info("Sent registration message")
            
            # Wait for acknowledgment
            response = await websocket.recv()
            data = json.loads(response)
            logger.info(f"Received response: {data}")
            
            if data.get("type") == "register_ack" and data.get("status") == "success":
                logger.info("✅ Mobile client connection successful!")
                return True
            else:
                logger.error("❌ Mobile client connection failed")
                return False
                
    except Exception as e:
        logger.error(f"❌ Connection error: {e}")
        return False

async def main():
    """Main test function"""
    logger.info("🧪 Testing FedMob connection flow...")
    
    # Test mobile client connection
    success = await test_mobile_client_connection()
    
    if success:
        logger.info("🎉 All tests passed!")
    else:
        logger.error("💥 Tests failed!")

if __name__ == "__main__":
    asyncio.run(main())
