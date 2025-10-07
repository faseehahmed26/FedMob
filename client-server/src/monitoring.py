"""
Basic monitoring setup for FedMob
Provides hooks for custom monitoring implementation
"""

import logging
from typing import Dict, Any
import time

logger = logging.getLogger(__name__)

class FedMobMonitor:
    """Simple monitoring interface that can be extended"""
    
    def __init__(self):
        self.metrics = {}
        self.start_time = time.time()
        
    def log_client_event(self, client_id: str, event_type: str, data: Dict[str, Any] = None):
        """Log client-related events"""
        logger.info(f"Client {client_id} - {event_type}: {data or {}}")
        
    def log_training_metrics(self, client_id: str, round_num: int, metrics: Dict[str, float]):
        """Log training metrics"""
        logger.info(f"Training metrics - Client {client_id}, Round {round_num}: {metrics}")
        
    def log_model_conversion(self, client_id: str, success: bool, error: str = None):
        """Log model conversion events"""
        if success:
            logger.info(f"Model conversion successful - Client {client_id}")
        else:
            logger.error(f"Model conversion failed - Client {client_id}: {error}")
            
    def get_system_metrics(self) -> Dict[str, Any]:
        """Get basic system metrics"""
        return {
            "uptime": time.time() - self.start_time,
            "metrics": self.metrics
        }
        
    def update_metric(self, name: str, value: Any):
        """Update a specific metric"""
        self.metrics[name] = value
        
    def clear_metrics(self):
        """Clear all metrics"""
        self.metrics = {}
