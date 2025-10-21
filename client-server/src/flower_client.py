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
from flwr.common import (
    GetParametersRes,
    Parameters,
    Status,
    Code,
    ndarrays_to_parameters,
)


logger = logging.getLogger(__name__)

class FedMobFlowerClient(fl.client.Client):
    """Flower client that bridges mobile clients with Flower server"""
    
    def __init__(self, mobile_client_id: str, message_handler=None, send_to_mobile=None):
        self.mobile_client_id = mobile_client_id
        self.current_weights = None
        self.current_config = None
        self.training_finished = asyncio.Event()
        self.training_result = None
        self.message_handler = message_handler
        self.send_to_mobile = send_to_mobile
        
    def get_parameters(self, config: Dict[str, str]) -> GetParametersRes:
        """Get current model parameters"""
        print(f"🔍 [FLOWER CLIENT] get_parameters called for {self.mobile_client_id}")
        print(f"🔍 [FLOWER CLIENT] Current weights type: {type(self.current_weights)}")
        print(f"🔍 [FLOWER CLIENT] Current weights: {self.current_weights}")
        
        if self.current_weights is None:
            print(f"🔍 [FLOWER CLIENT] No weights available, returning empty parameters")
            # Create empty parameters and status
            empty_params = ndarrays_to_parameters([])
            status = Status(code=Code.OK, message="Success")
            return GetParametersRes(status=status, parameters=empty_params)
        
        print(f"🔍 [FLOWER CLIENT] Returning weights: {len(self.current_weights)} tensors")
        # Create parameters with weights and status
        params = ndarrays_to_parameters(self.current_weights)
        status = Status(code=Code.OK, message="Success")
        return GetParametersRes(status=status, parameters=params)
    def get_properties(self, config: Dict[str, str]) -> Dict[str, str]:
        """Get client properties"""
        return {
            "mobile_client_id": self.mobile_client_id,
            "device_type": "mobile"
        }
        
    async def fit(
        self,
        parameters: fl.common.Parameters,
        config: Dict[str, str]
    ) -> Tuple[fl.common.Parameters, int, Dict[str, float]]:
        """Train model on local data"""
        try:
            print(f"🏋️ [FLOWER CLIENT] fit called for {self.mobile_client_id}")
            print(f"🏋️ [FLOWER CLIENT] Parameters type: {type(parameters)}")
            print(f"🏋️ [FLOWER CLIENT] Config: {config}")
            
            # Extract weights from Parameters object
            if parameters.tensors:
                weights = parameters.tensors
                print(f"🏋️ [FLOWER CLIENT] Extracted {len(weights)} weight tensors")
            else:
                weights = []
                print(f"🏋️ [FLOWER CLIENT] No weight tensors in parameters")
                
            # Convert parameters to TF.js format for mobile client
            tfjs_weights = ModelConverter.tf_to_tfjs_weights(weights)
            print(f"🏋️ [FLOWER CLIENT] Converted to TF.js format: {len(tfjs_weights)} weights")
            
            # Store current configuration
            self.current_config = config
            
            # Clear previous training state
            self.training_finished.clear()
            self.training_result = None
            
            print(f"🏋️ [FLOWER CLIENT] Sending fit request to mobile client")
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
            
            print(f"🏋️ [FLOWER CLIENT] Waiting for mobile client to complete training...")
            # Wait for mobile client to complete training
            await self.training_finished.wait()
            
            if self.training_result is None:
                print(f"❌ [FLOWER CLIENT] Training failed or was interrupted")
                raise Exception("Training failed or was interrupted")
            
            print(f"✅ [FLOWER CLIENT] Training completed successfully")
            print(f"🏋️ [FLOWER CLIENT] Result: {self.training_result['num_samples']} samples, metrics: {self.training_result['metrics']}")
                
            # Return parameters using the correct format
            params = ndarrays_to_parameters(self.training_result["weights"])
            return (
                params,
                self.training_result["num_samples"],
                self.training_result["metrics"]
            )
            
        except Exception as e:
            print(f"❌ [FLOWER CLIENT] Error during fit: {e}")
            logger.error(f"Error during fit: {e}")
            # Return current parameters if training fails
            return parameters, 0, {}
            
    def evaluate(
        self,
        parameters: fl.common.Parameters,
        config: Dict[str, str]
    ) -> Tuple[float, int, Dict[str, float]]:
        """Evaluate model on local data"""
        # For now, return default values as evaluation is done on mobile
        return 0.0, 0, {"accuracy": 0.0}
        
    def set_mobile_weights(self, weights: List[Dict]) -> None:
        """Set weights received from mobile client"""
        try:
            print(f"📥 [FLOWER CLIENT] Setting mobile weights for {self.mobile_client_id}")
            print(f"📥 [FLOWER CLIENT] Received {len(weights)} weight objects")
            # Convert TF.js weights to Python TF format
            self.current_weights = ModelConverter.tfjs_to_tf_weights(weights)
            print(f"📥 [FLOWER CLIENT] Converted to {len(self.current_weights)} tensors")
            logger.info(f"Updated weights from mobile client {self.mobile_client_id}")
        except Exception as e:
            print(f"❌ [FLOWER CLIENT] Error setting mobile weights: {e}")
            logger.error(f"Error setting mobile weights: {e}")
            
    def complete_training(self, result: Dict) -> None:
        """Called when mobile client completes training"""
        try:
            print(f"✅ [FLOWER CLIENT] Training completed by mobile client {self.mobile_client_id}")
            print(f"✅ [FLOWER CLIENT] Result: {result.get('num_samples', 0)} samples, metrics: {result.get('metrics', {})}")
            
            self.training_result = {
                "weights": ModelConverter.tfjs_to_tf_weights(result["weights"]),
                "num_samples": result.get("num_samples", 0),
                "metrics": result.get("metrics", {})
            }
            self.training_finished.set()
            print(f"✅ [FLOWER CLIENT] Training result set and event triggered")
            logger.info(f"Training completed by mobile client {self.mobile_client_id}")
        except Exception as e:
            print(f"❌ [FLOWER CLIENT] Error completing training: {e}")
            logger.error(f"Error completing training: {e}")
            self.training_finished.set()  # Set event to unblock fit()
