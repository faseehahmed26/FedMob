"""
Flower Client Manager for FedMob
Manages Flower clients for mobile devices
"""

import logging
from typing import Dict, Optional
from flower_client import FedMobFlowerClient

logger = logging.getLogger(__name__)

class FlowerClientManager:
    """Manages Flower clients for mobile devices"""
    
    def __init__(self):
        self.clients: Dict[str, FedMobFlowerClient] = {}
        
    def get_or_create_client(self, mobile_client_id: str) -> FedMobFlowerClient:
        """Get existing client or create new one"""
        if mobile_client_id not in self.clients:
            logger.info(f"Creating new Flower client for mobile client {mobile_client_id}")
            self.clients[mobile_client_id] = FedMobFlowerClient(mobile_client_id)
        return self.clients[mobile_client_id]
        
    def get_client(self, mobile_client_id: str) -> Optional[FedMobFlowerClient]:
        """Get existing client"""
        return self.clients.get(mobile_client_id)
        
    def remove_client(self, mobile_client_id: str) -> None:
        """Remove client"""
        if mobile_client_id in self.clients:
            logger.info(f"Removing Flower client for mobile client {mobile_client_id}")
            del self.clients[mobile_client_id]
            
    def handle_weights_update(self, mobile_client_id: str, weights: Dict) -> None:
        """Handle weights update from mobile client"""
        client = self.get_client(mobile_client_id)
        if client:
            client.set_mobile_weights(weights)
        else:
            logger.warning(f"No Flower client found for mobile client {mobile_client_id}")
            
    def handle_training_complete(self, mobile_client_id: str, result: Dict) -> None:
        """Handle training completion from mobile client"""
        client = self.get_client(mobile_client_id)
        if client:
            client.complete_training(result)
        else:
            logger.warning(f"No Flower client found for mobile client {mobile_client_id}")
            
    def get_client_count(self) -> int:
        """Get number of active clients"""
        return len(self.clients)
