"""
Flower Client Implementation for FedMob
Bridges between mobile clients and Flower server
"""

import flwr as fl
import numpy as np
from typing import Dict, Tuple, Optional, List
import tensorflow as tf
from model_converter import ModelConverter
import logging
import asyncio

logger = logging.getLogger(__name__)

class FedMobFlowerClient(fl.client.Client):
    """Flower client that bridges mobile clients with Flower server"""
    
    def __init__(self, mobile_client_id: str):
        self.mobile_client_id = mobile_client_id
        self.current_weights = None
        self.current_config = None
        self.training_finished = asyncio.Event()
        self.training_result = None
        
    def get_parameters(self, config: Dict[str, str]) -> fl.common.NDArrays:
        """Get current model parameters"""
        if self.current_weights is None:
            # Return empty weights if none available
            return []
        return self.current_weights
        
    def get_properties(self, config: Dict[str, str]) -> Dict[str, str]:
        """Get client properties"""
        return {
            "mobile_client_id": self.mobile_client_id,
            "device_type": "mobile"
        }
        
    async def fit(
        self,
        parameters: fl.common.NDArrays,
        config: Dict[str, str]
    ) -> Tuple[fl.common.NDArrays, int, Dict[str, float]]:
        """Train model on local data"""
        try:
            # Convert parameters to TF.js format for mobile client
            tfjs_weights = ModelConverter.tf_to_tfjs_weights(parameters)
            
            # Store current configuration
            self.current_config = config
            
            # Clear previous training state
            self.training_finished.clear()
            self.training_result = None
            
            # Notify message handler about fit request
            await self.message_handler.handle_flower_message(
                self.mobile_client_id,
                {
                    "type": "fit",
                    "weights": tfjs_weights,
                    "config": config,
                    "round": config.get("round", 0)
                },
                self.send_to_mobile
            )
            
            # Wait for mobile client to complete training
            await self.training_finished.wait()
            
            if self.training_result is None:
                raise Exception("Training failed or was interrupted")
                
            return (
                self.training_result["weights"],
                self.training_result["num_samples"],
                self.training_result["metrics"]
            )
            
        except Exception as e:
            logger.error(f"Error during fit: {e}")
            # Return current parameters if training fails
            return parameters, 0, {}
            
    def evaluate(
        self,
        parameters: fl.common.NDArrays,
        config: Dict[str, str]
    ) -> Tuple[float, int, Dict[str, float]]:
        """Evaluate model on local data"""
        # For now, return default values as evaluation is done on mobile
        return 0.0, 0, {"accuracy": 0.0}
        
    def set_mobile_weights(self, weights: List[Dict]) -> None:
        """Set weights received from mobile client"""
        try:
            # Convert TF.js weights to Python TF format
            self.current_weights = ModelConverter.tfjs_to_tf_weights(weights)
            logger.info(f"Updated weights from mobile client {self.mobile_client_id}")
        except Exception as e:
            logger.error(f"Error setting mobile weights: {e}")
            
    def complete_training(self, result: Dict) -> None:
        """Called when mobile client completes training"""
        try:
            self.training_result = {
                "weights": ModelConverter.tfjs_to_tf_weights(result["weights"]),
                "num_samples": result.get("num_samples", 0),
                "metrics": result.get("metrics", {})
            }
            self.training_finished.set()
            logger.info(f"Training completed by mobile client {self.mobile_client_id}")
        except Exception as e:
            logger.error(f"Error completing training: {e}")
            self.training_finished.set()  # Set event to unblock fit()
