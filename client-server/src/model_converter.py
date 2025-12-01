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
        
        print(f"[MODEL CONVERTER] Converting {len(tfjs_weights)} weight layers from TF.js to TF")
        
        for i, weight in enumerate(tfjs_weights):
            # Decode base64 data
            binary_data = base64.b64decode(weight['data'])
            
            # Convert to numpy array
            array = np.frombuffer(binary_data, dtype=np.float32)
            
            # Reshape according to shape metadata
            array = array.reshape(weight['shape'])
            
            # Log shape for debugging
            print(f"[MODEL CONVERTER] Layer {i}: shape={array.shape}, dtype={array.dtype}, size={array.size}")
            
            tf_weights.append(array)
        
        print(f"[MODEL CONVERTER] Converted {len(tf_weights)} weight layers successfully")
        return tf_weights
    
    @staticmethod
    def tf_to_tfjs_weights(tf_weights: List[np.ndarray]) -> List[Dict[str, Any]]:
        """Convert Python TF weights to TF.js format"""
        tfjs_weights = []
        
        try:
            print(f"[MODEL CONVERTER] Converting {len(tf_weights)} weight layers from TF to TF.js")
            
            if not tf_weights:
                print(f"[MODEL CONVERTER] Warning: Empty weight list provided")
                return []
                
            if not isinstance(tf_weights, list):
                raise ValueError(f"Expected list of weights, got {type(tf_weights)}")
            
            for i, weight in enumerate(tf_weights):
                try:
                    print(f"[MODEL CONVERTER] Processing layer {i}")
                    
                    # Validate input weight
                    if not isinstance(weight, np.ndarray):
                        raise ValueError(f"Layer {i}: Expected numpy array, got {type(weight)}")
                    
                    if weight.size == 0:
                        raise ValueError(f"Layer {i}: Empty array not allowed")
                    
                    print(f"[MODEL CONVERTER] Layer {i}: Input shape={weight.shape}, dtype={weight.dtype}")
                    
                    # Validate for non-finite values
                    if not np.isfinite(weight).all():
                        nan_count = np.isnan(weight).sum()
                        inf_count = np.isinf(weight).sum()
                        print(f"[MODEL CONVERTER] Warning: Layer {i} contains {nan_count} NaN and {inf_count} infinite values")
                    
                    # Convert to float32 if needed
                    original_dtype = weight.dtype
                    if weight.dtype != np.float32:
                        try:
                            weight = weight.astype(np.float32)
                            print(f"[MODEL CONVERTER] Layer {i}: Converted from {original_dtype} to float32")
                        except Exception as e:
                            raise ValueError(f"Layer {i}: Failed to convert to float32: {e}")
                    
                    # Log shape for debugging
                    print(f"[MODEL CONVERTER] Layer {i}: shape={weight.shape}, dtype={weight.dtype}, size={weight.size}")
                    
                    # Get binary data
                    try:
                        binary_data = weight.tobytes()
                        print(f"[MODEL CONVERTER] Layer {i}: Serialized to {len(binary_data)} bytes")
                    except Exception as e:
                        raise ValueError(f"Layer {i}: Failed to serialize to bytes: {e}")
                    
                    # Encode as base64
                    try:
                        encoded_data = base64.b64encode(binary_data).decode('utf-8')
                        print(f"[MODEL CONVERTER] Layer {i}: Encoded to base64 ({len(encoded_data)} chars)")
                    except Exception as e:
                        raise ValueError(f"Layer {i}: Failed to encode to base64: {e}")
                    
                    # Create weight entry
                    weight_entry = {
                        'shape': list(weight.shape),  # Convert tuple to list for JSON
                        'dtype': 'float32',
                        'data': encoded_data
                    }
                    
                    # Validate created object
                    if not isinstance(weight_entry['shape'], list) or not all(isinstance(s, int) for s in weight_entry['shape']):
                        raise ValueError(f"Layer {i}: Invalid shape in output object")
                    
                    tfjs_weights.append(weight_entry)
                    
                except Exception as e:
                    print(f"[MODEL CONVERTER] ERROR: Failed to process layer {i}: {e}")
                    raise Exception(f"Layer {i} conversion failed: {e}")
            
            print(f"[MODEL CONVERTER] Successfully converted {len(tfjs_weights)} weight layers")
            return tfjs_weights
            
        except Exception as e:
            print(f"[MODEL CONVERTER] CRITICAL ERROR: TF to TF.js conversion failed: {e}")
            print(f"[MODEL CONVERTER] Input details: type={type(tf_weights)}, length={len(tf_weights) if hasattr(tf_weights, '__len__') else 'N/A'}")
            if tf_weights and len(tf_weights) > 0:
                print(f"[MODEL CONVERTER] First weight details: type={type(tf_weights[0])}, shape={getattr(tf_weights[0], 'shape', 'N/A')}")
            import traceback
            traceback.print_exc()
            raise Exception(f"Weight conversion from TF to TF.js failed: {e}")
    
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
        print("Conversion test passed")
    else:
        print("❌ Conversion test failed")

if __name__ == "__main__":
    test_conversion()
