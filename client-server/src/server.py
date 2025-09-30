#!/usr/bin/env python3
"""
FedMob Python Client Server
Handles communication between mobile clients and Flower server
"""

import asyncio
import websockets
import json
import logging
from typing import Dict, List, Optional
import tensorflow as tf
from model_converter import ModelConverter
from client_manager import ClientManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ClientServer:
    def __init__(self, host: str = "0.0.0.0", port: int = 8082):
        self.host = host
        self.port = port
        self.client_manager = ClientManager()
        
    async def handle_client(self, websocket: websockets.WebSocketServerProtocol, path: str):
        """Handle individual client connection"""
        client_id = None
        try:
            # Wait for client registration
            message = await websocket.recv()
            data = json.loads(message)
            
            if data["type"] == "register":
                client_id = data["client_id"]
                logger.info(f"Client {client_id} connected")
                
                # Add client to manager
                self.client_manager.add_client(client_id, websocket)
                
                # Send acknowledgment
                await websocket.send(json.dumps({
                    "type": "register_ack",
                    "status": "success"
                }))
                
                # Handle client messages
                async for message in websocket:
                    try:
                        data = json.loads(message)
                        await self.handle_message(client_id, data)
                    except json.JSONDecodeError:
                        logger.error(f"Invalid JSON from client {client_id}")
                        continue
                        
        except Exception as e:
            logger.error(f"Error handling client: {e}")
        finally:
            if client_id:
                self.client_manager.remove_client(client_id)
                logger.info(f"Client {client_id} disconnected")
                
    async def handle_message(self, client_id: str, message: Dict):
        """Handle messages from clients"""
        try:
            client = self.client_manager.get_client(client_id)
            if not client:
                logger.error(f"Unknown client {client_id}")
                return
                
            message_type = message["type"]
            self.client_manager.update_client_activity(client_id)
            
            if message_type == "start_training":
                # Handle training start request
                round_num = message.get("round", 0)
                self.client_manager.start_client_training(client_id, round_num)
                await self.send_message(client_id, {
                    "type": "training_started",
                    "round": round_num
                })
                
            elif message_type == "training_update":
                # Handle training progress update
                progress = message.get("progress", 0)
                self.client_manager.update_training_progress(client_id, progress)
                
            elif message_type == "update_weights":
                # Handle weight updates from mobile client
                try:
                    tfjs_weights = message.get("weights", [])
                    # Convert weights from TF.js to Python TF format
                    tf_weights = ModelConverter.tfjs_to_tf_weights(tfjs_weights)
                    logger.info(f"Converted weights from client {client_id}")
                    
                    # TODO: Send weights to Flower server
                    # For now, just acknowledge
                    await self.send_message(client_id, {
                        "type": "weights_received",
                        "status": "success"
                    })
                except Exception as e:
                    logger.error(f"Error converting weights: {e}")
                    await self.send_message(client_id, {
                        "type": "weights_received",
                        "status": "error",
                        "error": str(e)
                    })
                    
            elif message_type == "training_complete":
                # Handle training completion
                self.client_manager.complete_client_training(client_id)
                await self.send_message(client_id, {
                    "type": "training_acknowledged"
                })
                
        except Exception as e:
            logger.error(f"Error handling message from client {client_id}: {e}")
            
    async def send_message(self, client_id: str, message: Dict):
        """Send message to specific client"""
        try:
            client = self.client_manager.get_client(client_id)
            if client:
                await client.websocket.send(json.dumps(message))
            else:
                logger.error(f"Cannot send message - unknown client {client_id}")
        except Exception as e:
            logger.error(f"Error sending message to client {client_id}: {e}")
            
    async def cleanup_inactive_clients(self):
        """Periodically remove inactive clients"""
        while True:
            try:
                inactive_clients = self.client_manager.get_inactive_clients(timeout=300)  # 5 minutes
                for client_id in inactive_clients:
                    logger.warning(f"Removing inactive client {client_id}")
                    self.client_manager.remove_client(client_id)
                
                # Log client summary
                summary = self.client_manager.get_client_summary()
                logger.info(f"Client summary: {json.dumps(summary, indent=2)}")
                
                await asyncio.sleep(60)  # Check every minute
            except Exception as e:
                logger.error(f"Error in cleanup task: {e}")
                await asyncio.sleep(60)
    
    async def start(self):
        """Start the WebSocket server"""
        logger.info(f"Starting server on {self.host}:{self.port}")
        
        # Start cleanup task
        asyncio.create_task(self.cleanup_inactive_clients())
        
        # Start server
        async with websockets.serve(self.handle_client, self.host, self.port):
            await asyncio.Future()  # run forever

def main():
    """Main entry point"""
    server = ClientServer()
    try:
        asyncio.run(server.start())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}")

if __name__ == "__main__":
    main()
