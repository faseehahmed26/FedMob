"""
Model Converter for FedMob
Handles conversion between TensorFlow.js and Python TensorFlow formats
"""

import numpy as np
import tensorflow as tf
import json
import base64
from typing import Dict, List, Tuple, Any

class ModelConverter:
    """Converts models and weights between TF.js and Python TF formats"""
    
    @staticmethod
    def tfjs_to_tf_weights(tfjs_weights: List[Dict[str, Any]]) -> List[np.ndarray]:
        """Convert TF.js weights to Python TF weights"""
        tf_weights = []
        
        for weight in tfjs_weights:
            # Decode base64 data
            binary_data = base64.b64decode(weight['data'])
            
            # Convert to numpy array
            array = np.frombuffer(binary_data, dtype=np.float32)
            
            # Reshape according to shape metadata
            array = array.reshape(weight['shape'])
            
            tf_weights.append(array)
            
        return tf_weights
    
    @staticmethod
    def tf_to_tfjs_weights(tf_weights: List[np.ndarray]) -> List[Dict[str, Any]]:
        """Convert Python TF weights to TF.js format"""
        tfjs_weights = []
        
        for weight in tf_weights:
            # Convert to float32 if needed
            if weight.dtype != np.float32:
                weight = weight.astype(np.float32)
            
            # Get binary data
            binary_data = weight.tobytes()
            
            # Encode as base64
            encoded_data = base64.b64encode(binary_data).decode('utf-8')
            
            # Create weight entry
            weight_entry = {
                'shape': weight.shape,
                'dtype': 'float32',
                'data': encoded_data
            }
            
            tfjs_weights.append(weight_entry)
            
        return tfjs_weights
    
    @staticmethod
    def verify_conversion(original: List[np.ndarray], converted: List[np.ndarray], 
                         tolerance: float = 1e-6) -> bool:
        """Verify that weights were converted correctly"""
        if len(original) != len(converted):
            return False
            
        for orig, conv in zip(original, converted):
            if orig.shape != conv.shape:
                return False
            if not np.allclose(orig, conv, atol=tolerance):
                return False
                
        return True

def test_conversion():
    """Simple test for weight conversion"""
    # Create test weights
    test_weights = [
        np.array([[1.0, 2.0], [3.0, 4.0]], dtype=np.float32),
        np.array([0.1, 0.2, 0.3], dtype=np.float32)
    ]
    
    # Convert to TF.js format
    tfjs_weights = ModelConverter.tf_to_tfjs_weights(test_weights)
    
    # Convert back to TF format
    converted_weights = ModelConverter.tfjs_to_tf_weights(tfjs_weights)
    
    # Verify conversion
    if ModelConverter.verify_conversion(test_weights, converted_weights):
        print("✅ Conversion test passed")
    else:
        print("❌ Conversion test failed")

if __name__ == "__main__":
    test_conversion()
