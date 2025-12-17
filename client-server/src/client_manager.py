"""
Client Manager for FedMob
Handles client state management and coordination
"""

from dataclasses import dataclass
from typing import Dict, Optional, List
import websockets
import logging
import time
import json

logger = logging.getLogger(__name__)

@dataclass
class ClientState:
    """Client state information"""
    client_id: str
    websocket: websockets.WebSocketServerProtocol
    connected_at: float
    last_active: float
    is_training: bool = False
    current_round: int = 0
    training_progress: float = 0.0
    fl_session_active: bool = False  # Track if Flower client is connected
    state: str = "ready"  # States: ready, fl_active, training, completed
    
class ClientManager:
    """Manages connected clients and their states"""
    
    def __init__(self):
        self.clients: Dict[str, ClientState] = {}
        
    def add_client(self, client_id: str, websocket: websockets.WebSocketServerProtocol) -> None:
        """Add new client"""
        current_time = time.time()
        self.clients[client_id] = ClientState(
            client_id=client_id,
            websocket=websocket,
            connected_at=current_time,
            last_active=current_time
        )
        logger.info(f"Added client {client_id}")
        
    def remove_client(self, client_id: str) -> None:
        """Remove client"""
        if client_id in self.clients:
            del self.clients[client_id]
            logger.info(f"Removed client {client_id}")
            
    def get_client(self, client_id: str) -> Optional[ClientState]:
        """Get client state"""
        return self.clients.get(client_id)
        
    def update_client_activity(self, client_id: str) -> None:
        """Update client's last active timestamp"""
        if client_id in self.clients:
            self.clients[client_id].last_active = time.time()
            
    def update_training_progress(self, client_id: str, progress: float) -> None:
        """Update client's training progress"""
        if client_id in self.clients:
            client = self.clients[client_id]
            client.training_progress = progress
            client.last_active = time.time()
            logger.info(f"Client {client_id} training progress: {progress}%")
            
    def start_fl_session(self, client_id: str) -> None:
        """Mark client as having active FL session (Flower client connected)"""
        if client_id in self.clients:
            client = self.clients[client_id]
            client.fl_session_active = True
            client.state = "fl_active"
            client.last_active = time.time()
            logger.info(f"Client {client_id} entered FL session")
    
    def start_client_training(self, client_id: str, round_num: int) -> None:
        """Mark client as training"""
        if client_id in self.clients:
            client = self.clients[client_id]
            client.is_training = True
            client.current_round = round_num
            client.training_progress = 0.0
            client.state = "training"
            client.last_active = time.time()
            logger.info(f"Client {client_id} started training round {round_num}")
            
    def complete_client_training(self, client_id: str) -> None:
        """Mark client as done training"""
        if client_id in self.clients:
            client = self.clients[client_id]
            client.is_training = False
            client.training_progress = 100.0
            client.state = "fl_active"  # Back to FL active, waiting for next round
            client.last_active = time.time()
            logger.info(f"Client {client_id} completed training round {client.current_round}")
    
    def end_fl_session(self, client_id: str) -> None:
        """Mark client FL session as ended"""
        if client_id in self.clients:
            client = self.clients[client_id]
            client.fl_session_active = False
            client.is_training = False
            client.state = "ready"
            client.current_round = 0
            client.training_progress = 0.0
            client.last_active = time.time()
            logger.info(f"Client {client_id} ended FL session")
            
    def get_training_clients(self) -> List[ClientState]:
        """Get all clients currently training"""
        return [client for client in self.clients.values() if client.is_training]
        
    def get_available_clients(self) -> List[ClientState]:
        """Get all clients not currently training"""
        return [client for client in self.clients.values() if not client.is_training]
        
    def get_inactive_clients(self, timeout: float = 300) -> List[str]:
        """Get clients that haven't been active for timeout seconds"""
        current_time = time.time()
        return [
            client_id for client_id, client in self.clients.items()
            if current_time - client.last_active > timeout
        ]
        
    async def broadcast_message(self, message: Dict) -> None:
        """Send message to all connected clients"""
        for client in self.clients.values():
            try:
                await client.websocket.send(json.dumps(message))
            except Exception as e:
                logger.error(f"Error broadcasting to client {client.client_id}: {e}")
                
    def get_client_summary(self) -> Dict:
        """Get summary of all clients"""
        return {
            "total_clients": len(self.clients),
            "training_clients": len(self.get_training_clients()),
            "available_clients": len(self.get_available_clients()),
            "clients": [
                {
                    "id": client.client_id,
                    "status": "training" if client.is_training else "available",
                    "state": client.state,
                    "fl_session": client.fl_session_active,
                    "round": client.current_round,
                    "progress": client.training_progress,
                    "connected_for": time.time() - client.connected_at
                }
                for client in self.clients.values()
            ]
        }
