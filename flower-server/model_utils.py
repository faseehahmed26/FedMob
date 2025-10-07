"""
Model serialization utilities for FedMob
Handles conversion between different model formats for client-server communication
"""

import numpy as np
import json
import pickle
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class ModelSerializer:
    """Handles model parameter serialization and deserialization"""
    
    @staticmethod
    def serialize_weights(weights: List[np.ndarray]) -> bytes:
        """Serialize model weights to bytes for network transmission"""
        try:
            # Convert numpy arrays to lists for JSON serialization
            serializable_weights = []
            for weight in weights:
                if isinstance(weight, np.ndarray):
                    serializable_weights.append(weight.tolist())
                else:
                    serializable_weights.append(weight)
            
            # Serialize to JSON bytes
            serialized = json.dumps(serializable_weights).encode('utf-8')
            logger.debug(f"Serialized weights: {len(serialized)} bytes")
            return serialized
            
        except Exception as e:
            logger.error(f"Error serializing weights: {e}")
            raise
    
    @staticmethod
    def deserialize_weights(serialized_weights: bytes) -> List[np.ndarray]:
        """Deserialize model weights from bytes"""
        try:
            # Decode JSON bytes
            weights_data = json.loads(serialized_weights.decode('utf-8'))
            
            # Convert back to numpy arrays
            weights = []
            for weight_data in weights_data:
                weights.append(np.array(weight_data, dtype=np.float32))
            
            logger.debug(f"Deserialized weights: {len(weights)} layers")
            return weights
            
        except Exception as e:
            logger.error(f"Error deserializing weights: {e}")
            raise
    
    @staticmethod
    def weights_to_dict(weights: List[np.ndarray]) -> Dict[str, Any]:
        """Convert weights to dictionary format"""
        return {
            "weights": [w.tolist() for w in weights],
            "shapes": [list(w.shape) for w in weights],
            "dtypes": [str(w.dtype) for w in weights]
        }
    
    @staticmethod
    def dict_to_weights(weights_dict: Dict[str, Any]) -> List[np.ndarray]:
        """Convert dictionary format back to weights"""
        weights = []
        for weight_data in weights_dict["weights"]:
            weights.append(np.array(weight_data, dtype=np.float32))
        return weights
    
    @staticmethod
    def validate_weights(weights: List[np.ndarray]) -> bool:
        """Validate that weights are properly formatted"""
        if not weights:
            return False
        
        for weight in weights:
            if not isinstance(weight, np.ndarray):
                return False
            if not np.isfinite(weight).all():
                logger.warning("Non-finite values found in weights")
                return False
        
        return True
    
    @staticmethod
    def get_weights_info(weights: List[np.ndarray]) -> Dict[str, Any]:
        """Get information about weights for logging"""
        total_params = sum(w.size for w in weights)
        total_memory = sum(w.nbytes for w in weights)
        
        return {
            "num_layers": len(weights),
            "total_parameters": total_params,
            "total_memory_bytes": total_memory,
            "shapes": [list(w.shape) for w in weights],
            "dtypes": [str(w.dtype) for w in weights]
        }

class MNISTModelUtils:
    """Utilities specific to MNIST model handling"""
    
    @staticmethod
    def create_model_architecture(variant: str = "basic") -> Dict[str, Any]:
        """Create MNIST CNN architecture for given variant ('basic'|'lenet')"""
        if variant == "lenet":
            return {
                "input_shape": [28, 28, 1],
                "num_classes": 10,
                "layers": [
                    {"type": "conv2d", "filters": 6, "kernel_size": [5, 5], "activation": "relu", "padding": "same", "input_shape": [28, 28, 1]},
                    {"type": "max_pooling2d", "pool_size": [2, 2], "strides": [2, 2]},
                    {"type": "conv2d", "filters": 16, "kernel_size": [5, 5], "activation": "relu", "padding": "same"},
                    {"type": "max_pooling2d", "pool_size": [2, 2], "strides": [2, 2]},
                    {"type": "flatten"},
                    {"type": "dense", "units": 120, "activation": "relu"},
                    {"type": "dense", "units": 84, "activation": "relu"},
                    {"type": "dense", "units": 10, "activation": "softmax"},
                ],
            }
        # default basic
        return {
            "input_shape": [28, 28, 1],
            "num_classes": 10,
            "layers": [
                {"type": "conv2d", "filters": 32, "kernel_size": [3, 3], "activation": "relu", "input_shape": [28, 28, 1]},
                {"type": "max_pooling2d", "pool_size": [2, 2]},
                {"type": "conv2d", "filters": 64, "kernel_size": [3, 3], "activation": "relu"},
                {"type": "max_pooling2d", "pool_size": [2, 2]},
                {"type": "flatten"},
                {"type": "dense", "units": 128, "activation": "relu"},
                {"type": "dense", "units": 10, "activation": "softmax"},
            ],
        }
    
    @staticmethod
    def get_expected_weights_shape(variant: str = "basic") -> List[tuple]:
        """Get expected shape for MNIST CNN weights for the given variant"""
        if variant == "lenet":
            # Shapes correspond to tfjs flattened ordering converted to numpy
            return [
                (5, 5, 1, 6),
                (6,),
                (5, 5, 6, 16),
                (16,),
                # After conv/pool stack, flatten size is 7*7*16 = 784 for 28x28 inputs
                (7 * 7 * 16, 120),
                (120,),
                (120, 84),
                (84,),
                (84, 10),
                (10,),
            ]
        # basic
        return [
            (3, 3, 1, 32),
            (32,),
            (3, 3, 32, 64),
            (64,),
            (5 * 5 * 64, 128),  # 28->26->13->11->5 after two conv(3) + pool(2)
            (128,),
            (128, 10),
            (10,),
        ]
    
    @staticmethod
    def validate_mnist_weights(weights: List[np.ndarray]) -> bool:
        """Validate MNIST model weights"""
        expected_shapes = MNISTModelUtils.get_expected_weights_shape()
        
        if len(weights) != len(expected_shapes):
            logger.error(f"Expected {len(expected_shapes)} weight layers, got {len(weights)}")
            return False
        
        for i, (weight, expected_shape) in enumerate(zip(weights, expected_shapes)):
            if weight.shape != expected_shape:
                logger.error(f"Layer {i}: expected shape {expected_shape}, got {weight.shape}")
                return False
        
        return True
