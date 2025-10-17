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
from monitoring import FedMobMonitor
from flower_client_manager import FlowerClientManager
from flower_connection import FlowerConnection
from message_handler import MessageHandler, MessageContext

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ClientServer:
    def __init__(self, host: str = "0.0.0.0", port: int = 8082, flower_server_address: str = "localhost:8080"):
        self.host = host
        self.port = port
        self.flower_server_address = flower_server_address
        self.client_manager = ClientManager()
        self.monitor = FedMobMonitor()
        self.flower_manager = FlowerClientManager()
        self.flower_connection = FlowerConnection(flower_server_address)
        self.message_handler = MessageHandler()
        
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
                
                # Add client to managers
                self.client_manager.add_client(client_id, websocket)
                
                # Create send function for this client
                send_fn = lambda msg: self.send_message(client_id, msg)
                
                # Create Flower client with proper dependencies
                flower_client = self.flower_manager.get_or_create_client(
                    client_id, 
                    message_handler=self.message_handler,
                    send_to_mobile=send_fn
                )
                
                # Add to Flower connection
                self.flower_connection.add_flower_client(client_id, flower_client)
                
                # Start Flower client connection
                await self.flower_connection.start_flower_client(client_id, flower_client)
                
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
                self.flower_manager.remove_client(client_id)
                await self.flower_connection.stop_flower_client(client_id)
                self.flower_connection.remove_flower_client(client_id)
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
            
            # Get Flower client for this mobile client
            flower_client = self.flower_manager.get_client(client_id)
            if not flower_client and message_type != "register":
                logger.error(f"No Flower client for {client_id}")
                return
                
            # Create send function for this client
            send_fn = lambda msg: self.send_message(client_id, msg)
            
            # Handle message through message handler
            await self.message_handler.handle_mobile_message(
                client_id,
                message,
                flower_client
            )
            
            # Update client state based on message type
            if message_type == "start_training":
                round_num = message.get("round", 0)
                self.client_manager.start_client_training(client_id, round_num)
            elif message_type == "training_update":
                progress = message.get("progress", 0)
                self.client_manager.update_training_progress(client_id, progress)
            elif message_type == "training_complete":
                self.client_manager.complete_client_training(client_id)
                
        except Exception as e:
            logger.error(f"Error handling message from client {client_id}: {e}")
            
    async def send_message(self, client_id: str, message: Dict):
        """Send message to specific client"""
        try:
            client = self.client_manager.get_client(client_id)
            if client:
                # Accept either dict or pre-encoded JSON string
                payload = json.dumps(message) if isinstance(message, dict) else message
                await client.websocket.send(payload)
            else:
                logger.error(f"Cannot send message - unknown client {client_id}")
        except Exception as e:
            logger.error(f"Error sending message to client {client_id}: {e}")
            
    async def cleanup_inactive_clients(self):
        """Periodically remove inactive clients"""
        while True:
            try:
                inactive_clients = self.client_manager.get_inactive_clients(timeout=600)  # 10 minutes
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
        
        # Initialize message handler with current loop
        self.message_handler.initialize(asyncio.get_event_loop())
        
        # Start cleanup task
        asyncio.create_task(self.cleanup_inactive_clients())
        
        # Start message handler
        asyncio.create_task(self.message_handler.start())
        
        # Create standard message handlers
        def create_send_fn(client_id):
            return lambda msg: self.send_message(client_id, msg)
            
        def get_flower_client(client_id):
            return self.flower_manager.get_client(client_id)
            
        self.message_handler.create_standard_handlers(
            create_send_fn,
            get_flower_client
        )
        
        # Start server
        async with websockets.serve(self.handle_client, self.host, self.port):
            try:
                await asyncio.Future()  # run forever
            finally:
                await self.message_handler.stop()

def main():
    """Main entry point"""
    server = ClientServer()
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(server.start())
        loop.run_forever()
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
        loop.stop()
    except Exception as e:
        logger.error(f"Server error: {e}")
    finally:
        loop.close()

if __name__ == "__main__":
    main()
