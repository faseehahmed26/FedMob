"""
Flower Server Connection for FedMob
Handles connection between client-server and flower-server
"""

import asyncio
import logging
import flwr as fl
from typing import Dict, Optional, Callable
from flower_client import FedMobFlowerClient

logger = logging.getLogger(__name__)

class FlowerConnection:
    """Manages connection to Flower server"""
    
    def __init__(self, server_address: str = "localhost:8080"):
        self.server_address = server_address
        self.flower_clients: Dict[str, FedMobFlowerClient] = {}
        self.running = False
        
    def add_flower_client(self, mobile_client_id: str, flower_client: FedMobFlowerClient):
        """Add a Flower client for a mobile client"""
        print(f"➕ [FLOWER CONNECTION] Adding Flower client for {mobile_client_id}")
        self.flower_clients[mobile_client_id] = flower_client
        print(f"✅ [FLOWER CONNECTION] Flower client added for {mobile_client_id}")
        logger.info(f"Added Flower client for mobile client {mobile_client_id}")
        
    def remove_flower_client(self, mobile_client_id: str):
        """Remove a Flower client"""
        if mobile_client_id in self.flower_clients:
            print(f"➖ [FLOWER CONNECTION] Removing Flower client for {mobile_client_id}")
            del self.flower_clients[mobile_client_id]
            print(f"✅ [FLOWER CONNECTION] Flower client removed for {mobile_client_id}")
            logger.info(f"Removed Flower client for mobile client {mobile_client_id}")
        else:
            print(f"⚠️ [FLOWER CONNECTION] No Flower client found for {mobile_client_id}")
            
    async def start_flower_client(self, mobile_client_id: str, flower_client: FedMobFlowerClient):
        """Start a Flower client connection to the server"""
        try:
            print(f"🚀 [FLOWER CONNECTION] Starting Flower client for {mobile_client_id}")
            print(f"🚀 [FLOWER CONNECTION] Connecting to server: {self.server_address}")
            logger.info(f"Starting Flower client for {mobile_client_id} connecting to {self.server_address}")
            
            # Start the Flower client in a separate task
            client_task = asyncio.create_task(
                fl.client.start_client(
                    server_address=self.server_address,
                    client=flower_client
                )
            )
            
            # Store the task for cleanup
            flower_client.client_task = client_task
            
            print(f"✅ [FLOWER CONNECTION] Flower client for {mobile_client_id} started successfully")
            logger.info(f"Flower client for {mobile_client_id} started successfully")
            return True
            
        except Exception as e:
            print(f"❌ [FLOWER CONNECTION] Failed to start Flower client for {mobile_client_id}: {e}")
            logger.error(f"Failed to start Flower client for {mobile_client_id}: {e}")
            return False
            
    async def stop_flower_client(self, mobile_client_id: str):
        """Stop a Flower client connection"""
        if mobile_client_id in self.flower_clients:
            print(f"🛑 [FLOWER CONNECTION] Stopping Flower client for {mobile_client_id}")
            flower_client = self.flower_clients[mobile_client_id]
            if hasattr(flower_client, 'client_task'):
                flower_client.client_task.cancel()
                try:
                    await flower_client.client_task
                except asyncio.CancelledError:
                    pass
            print(f"✅ [FLOWER CONNECTION] Stopped Flower client for {mobile_client_id}")
            logger.info(f"Stopped Flower client for {mobile_client_id}")
        else:
            print(f"⚠️ [FLOWER CONNECTION] No Flower client found to stop for {mobile_client_id}")
            
    async def stop_all_clients(self):
        """Stop all Flower client connections"""
        print(f"🛑 [FLOWER CONNECTION] Stopping all Flower clients ({len(self.flower_clients)} clients)")
        for mobile_client_id in list(self.flower_clients.keys()):
            await self.stop_flower_client(mobile_client_id)
        print(f"✅ [FLOWER CONNECTION] All Flower clients stopped")
            
    def get_flower_client(self, mobile_client_id: str) -> Optional[FedMobFlowerClient]:
        """Get Flower client for mobile client"""
        return self.flower_clients.get(mobile_client_id)
