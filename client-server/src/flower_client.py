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
    parameters_to_ndarrays,
    FitIns,
    FitRes,
    EvaluateIns,
    EvaluateRes,
)


logger = logging.getLogger(__name__)

# IMPORTANT: Keep this in sync with EVAL_SAMPLES in flower-server/config.py
EVAL_SAMPLES = 100  # Number of samples to report for evaluation

class FedMobFlowerClient(fl.client.Client):
    """Flower client that bridges mobile clients with Flower server"""
    
    def __init__(self, mobile_client_id: str, message_handler=None, send_to_mobile=None):
        self.mobile_client_id = mobile_client_id
        self.current_weights = None
        self.current_config = None
        self.training_finished = asyncio.Event()
        self.training_result = None
        self.evaluation_finished = asyncio.Event()
        self.evaluation_result = None
        self.message_handler = message_handler
        self.send_to_mobile = send_to_mobile
        
    def get_parameters(self, config: Dict[str, str]) -> GetParametersRes:
        """Get current model parameters"""
        print(f"[FLOWER CLIENT] get_parameters called for {self.mobile_client_id}")
        print(f"[FLOWER CLIENT] Current weights type: {type(self.current_weights)}")
        print(f"[FLOWER CLIENT] Current weights: {self.current_weights}")
        
        if self.current_weights is None:
            print(f"[FLOWER CLIENT] No weights available, returning empty parameters")
            # Create empty parameters and status
            empty_params = ndarrays_to_parameters([])
            status = Status(code=Code.OK, message="Success")
            return GetParametersRes(status=status, parameters=empty_params)
        
        print(f"[FLOWER CLIENT] Returning weights: {len(self.current_weights)} tensors")
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
        
    def fit(self, ins: FitIns) -> FitRes:
        """Train model on local data - SYNC method called by Flower framework"""
        try:
            print(f"[FLOWER CLIENT] fit() CALLED by Flower framework for {self.mobile_client_id}")
            print(f"[FLOWER CLIENT] FitIns type: {type(ins)}")
            
            # Extract parameters and config from FitIns object
            parameters = ins.parameters
            config = ins.config
            print(f"[FLOWER CLIENT] Parameters type: {type(parameters)}")
            print(f"[FLOWER CLIENT] Config type: {type(config)}")
            print(f"[FLOWER CLIENT] Config: {config}")
            
            # Convert ConfigRecord to dict if needed (for JSON serialization)
            if not isinstance(config, dict):
                try:
                    config = dict(config) if hasattr(config, '__iter__') and not isinstance(config, str) else {}
                    print(f"[FLOWER CLIENT] Converted config to dict: {type(config)}")
                except Exception as e:
                    print(f"[FLOWER CLIENT] Warning: Could not convert config to dict: {e}, using empty dict")
                    config = {}
            
            # Extract weights from Parameters object
            # Note: parameters.tensors contains serialized bytes after Round 1,
            # so we must deserialize them using parameters_to_ndarrays()
            if parameters.tensors:
                try:
                    print(f"[FLOWER CLIENT] Starting weight deserialization from Parameters object")
                    print(f"[FLOWER CLIENT] Parameters.tensors type: {type(parameters.tensors)}")
                    print(f"[FLOWER CLIENT] Parameters.tensors length: {len(parameters.tensors) if hasattr(parameters.tensors, '__len__') else 'N/A'}")
                    
                    weights = parameters_to_ndarrays(parameters)
                    print(f"[FLOWER CLIENT] Successfully deserialized {len(weights)} weight tensors from Parameters")
                    print(f"[FLOWER CLIENT] Weight types: {[type(w).__name__ for w in weights[:3]]}...")
                    
                    # Validate deserialized weights
                    for i, w in enumerate(weights[:3]):
                        print(f"[FLOWER CLIENT] Weight {i}: shape={w.shape}, dtype={w.dtype}")
                        
                except Exception as e:
                    logger.error(f"Failed to deserialize parameters: {e}")
                    print(f"[FLOWER CLIENT] CRITICAL ERROR: Failed to deserialize parameters: {e}")
                    print(f"[FLOWER CLIENT] Parameters object details:")
                    print(f"[FLOWER CLIENT]   - tensor_type: {getattr(parameters, 'tensor_type', 'N/A')}")
                    print(f"[FLOWER CLIENT]   - tensors count: {len(parameters.tensors) if hasattr(parameters.tensors, '__len__') else 'N/A'}")
                    if hasattr(parameters.tensors, '__len__') and len(parameters.tensors) > 0:
                        print(f"[FLOWER CLIENT]   - first tensor type: {type(parameters.tensors[0])}")
                    raise Exception(f"Weight deserialization failed: {e}")
            else:
                weights = []
                print(f"[FLOWER CLIENT] No weight tensors in parameters - using empty weights list")
                
            # Convert parameters to TF.js format for mobile client
            try:
                print(f"[FLOWER CLIENT] Starting conversion to TF.js format")
                print(f"[FLOWER CLIENT] Input weights type: {type(weights)}")
                print(f"[FLOWER CLIENT] Input weights length: {len(weights) if hasattr(weights, '__len__') else 'N/A'}")
                
                if weights and len(weights) > 0:
                    print(f"[FLOWER CLIENT] First weight details: type={type(weights[0])}, shape={getattr(weights[0], 'shape', 'N/A')}, dtype={getattr(weights[0], 'dtype', 'N/A')}")
                
                tfjs_weights = ModelConverter.tf_to_tfjs_weights(weights)
                
                print(f"[FLOWER CLIENT] Successfully converted to TF.js format: {len(tfjs_weights)} weights")
                
                # Validate converted weights
                if tfjs_weights and len(tfjs_weights) > 0:
                    first_weight = tfjs_weights[0]
                    print(f"[FLOWER CLIENT] First TF.js weight: type={type(first_weight)}, keys={list(first_weight.keys()) if isinstance(first_weight, dict) else 'N/A'}")
                    
            except Exception as e:
                logger.error(f"Failed to convert weights to TF.js format: {e}")
                print(f"[FLOWER CLIENT] CRITICAL ERROR: Failed to convert weights to TF.js format: {e}")
                print(f"[FLOWER CLIENT] Weight conversion details:")
                print(f"[FLOWER CLIENT]   - input type: {type(weights)}")
                print(f"[FLOWER CLIENT]   - input length: {len(weights) if hasattr(weights, '__len__') else 'N/A'}")
                if weights and len(weights) > 0:
                    print(f"[FLOWER CLIENT]   - first weight: type={type(weights[0])}, shape={getattr(weights[0], 'shape', 'N/A')}")
                import traceback
                traceback.print_exc()
                raise Exception(f"Weight conversion to TF.js failed: {e}")
            
            # Store current configuration
            self.current_config = config
            
            # Clear previous training state
            self.training_finished.clear()
            self.training_result = None
            
            # Run async operations using message handler's event loop
            if self.message_handler and self.message_handler.loop:
                print(f"[FLOWER CLIENT] Using message handler's event loop for async operations")
                loop = self.message_handler.loop
                
                # Run async fit operations in the existing event loop
                future = asyncio.run_coroutine_threadsafe(
                    self._async_fit_operations(tfjs_weights, config),
                    loop
                )
                
                print(f"[FLOWER CLIENT] Waiting for async operations to complete (timeout: 300s)...")
                try:
                    # Wait for result with timeout
                    result_params, num_examples, metrics = future.result(timeout=900)
                    print(f"[FLOWER CLIENT] Async operations completed successfully")
                    
                    # Create FitRes object
                    status = Status(code=Code.OK, message="Success")
                    fit_res = FitRes(
                        status=status,
                        parameters=result_params,
                        num_examples=num_examples,
                        metrics=metrics
                    )
                    return fit_res
                except asyncio.TimeoutError:
                    print(f"[FLOWER CLIENT] Timeout waiting for training to complete")
                    logger.error(f"Timeout waiting for training for {self.mobile_client_id}")
                    status = Status(code=Code.OK, message="Timeout waiting for training")
                    return FitRes(
                        status=status,
                        parameters=parameters,
                        num_examples=0,
                        metrics={}
                    )
                except Exception as e:
                    print(f"[FLOWER CLIENT] Error in async operations: {e}")
                    logger.error(f"Error in async operations: {e}")
                    import traceback
                    traceback.print_exc()
                    status = Status(code=Code.OK, message=f"Error: {str(e)}")
                    return FitRes(
                        status=status,
                        parameters=parameters,
                        num_examples=0,
                        metrics={}
                    )
            else:
                # Fallback: create new event loop (not ideal but works)
                print(f"[FLOWER CLIENT] No message handler loop available, creating new event loop")
                logger.warning(f"No message handler loop for {self.mobile_client_id}, using asyncio.run()")
                try:
                    result_params, num_examples, metrics = asyncio.run(self._async_fit_operations(tfjs_weights, config))
                    status = Status(code=Code.OK, message="Success")
                    return FitRes(
                        status=status,
                        parameters=result_params,
                        num_examples=num_examples,
                        metrics=metrics
                    )
                except Exception as e:
                    print(f"[FLOWER CLIENT] Error in asyncio.run(): {e}")
                    logger.error(f"Error in asyncio.run(): {e}")
                    import traceback
                    traceback.print_exc()
                    status = Status(code=Code.OK, message=f"Error: {str(e)}")
                    return FitRes(
                        status=status,
                        parameters=parameters,
                        num_examples=0,
                        metrics={}
                    )
            
        except Exception as e:
            print(f"[FLOWER CLIENT] Error during fit: {e}")
            logger.error(f"Error during fit: {e}")
            import traceback
            traceback.print_exc()
            # Return error FitRes if training fails
            status = Status(code=Code.OK, message=f"Error: {str(e)}")
            return FitRes(
                status=status,
                parameters=ins.parameters,
                num_examples=0,
                metrics={}
            )
    
    async def _async_fit_operations(self, tfjs_weights: List[Dict], config: Dict[str, str]) -> Tuple[fl.common.Parameters, int, Dict[str, float]]:
        """Async operations for fit() - runs in event loop"""
        print(f"[FLOWER CLIENT] ==================== ASYNC FIT START ====================")
        print(f"[FLOWER CLIENT] Starting async fit operations for {self.mobile_client_id}")
        print(f"[FLOWER CLIENT] Weights to send: {len(tfjs_weights)} layers")
        print(f"[FLOWER CLIENT] Config: {config}")
        
        print(f"[FLOWER CLIENT] Sending fit request to mobile client via message handler")
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
        
        print(f"[FLOWER CLIENT] Message sent to handler, now waiting for mobile to complete training...")
        print(f"[FLOWER CLIENT] Timeout: 300 seconds")
        # Wait for mobile client to complete training
        await self.training_finished.wait()
        
        if self.training_result is None:
            print(f"[FLOWER CLIENT] Training failed or was interrupted")
            raise Exception("Training failed or was interrupted")
        
        print(f"[FLOWER CLIENT] Training completed successfully")
        print(f"[FLOWER CLIENT] Result: {self.training_result['num_samples']} samples, metrics: {self.training_result['metrics']}")
        print(f"[FLOWER CLIENT] Returning {len(self.training_result['weights'])} weight layers to server")
            
        # Return parameters using the correct format
        params = ndarrays_to_parameters(self.training_result["weights"])
        return (
            params,
            self.training_result["num_samples"],
            self.training_result["metrics"]
        )
    
    async def _async_evaluate_operations(self, parameters: List[Dict], config: Dict[str, str]) -> Dict[str, float]:
        """Async operations for evaluate() - runs in event loop"""
        print(f"[FLOWER CLIENT] ==================== ASYNC EVALUATE START ====================")
        print(f"[FLOWER CLIENT] Starting async evaluate operations for {self.mobile_client_id}")
        print(f"[FLOWER CLIENT] Parameters: {len(parameters)} layers")
        print(f"[FLOWER CLIENT] Config: {config}")
        
        print(f"[FLOWER CLIENT] Sending evaluation request to mobile client via message handler")
        # Notify message handler about evaluation request
        await self.message_handler.handle_flower_message(
            self.mobile_client_id,
            {
                "type": "evaluate_request",
                "parameters": parameters,
                "config": config
            },
            self.send_to_mobile
        )
        
        print(f"[FLOWER CLIENT] Message sent to handler, now waiting for mobile to complete evaluation...")
        print(f"[FLOWER CLIENT] Timeout: 30 seconds")
        # Wait for mobile client to complete evaluation
        await asyncio.wait_for(
            asyncio.to_thread(self.evaluation_finished.wait),
            timeout=30
        )
        
        print(f"[FLOWER CLIENT] Mobile client completed evaluation")
        print(f"[FLOWER CLIENT] ==================== ASYNC EVALUATE END ====================")
        
        # Return the evaluation result
        return self.evaluation_result or {
            "loss": 0.0,
            "accuracy": 0.0,
            "num_examples": EVAL_SAMPLES,
            "metrics": {"accuracy": 0.0}
        }
            
    def evaluate(self, ins: EvaluateIns) -> EvaluateRes:
        """Evaluate model on local data by requesting evaluation from mobile client"""
        print(f"[FLOWER CLIENT] evaluate() called for {self.mobile_client_id}")
        print(f"[FLOWER CLIENT] Parameters: {type(ins.parameters)}, Config: {ins.config}")
        
        try:
            # Reset evaluation event
            self.evaluation_finished.clear()
            self.evaluation_result = None
            
            # Convert parameters to format mobile client can understand
            parameters = []
            if ins.parameters and ins.parameters.tensors:
                try:
                    # Convert Flower parameters to numpy arrays
                    numpy_params = parameters_to_ndarrays(ins.parameters)
                    # Convert numpy arrays to TF.js format for mobile client
                    parameters = ModelConverter.tf_to_tfjs_weights(numpy_params)
                    print(f"[FLOWER CLIENT] Converted {len(parameters)} parameter layers for evaluation")
                except Exception as e:
                    print(f"[FLOWER CLIENT] Warning: Failed to convert parameters for evaluation: {e}")
                    parameters = []  # Send empty parameters, use current model weights
            
            # Send evaluation request to mobile client via message handler
            if self.message_handler and self.send_to_mobile:
                print(f"[FLOWER CLIENT] Sending evaluation request to mobile client {self.mobile_client_id}")
                
                # Use the same pattern as fit() method
                try:
                    loop = asyncio.get_event_loop()
                    if loop.is_running():
                        # If we're in an event loop, use async operations
                        async_result = self._async_evaluate_operations(parameters, ins.config or {})
                        # Wait for async result synchronously
                        task = loop.create_task(async_result)
                        # Busy wait for the task to complete (not ideal but necessary for sync method)
                        import time
                        timeout = 30  # 30 seconds timeout
                        start_time = time.time()
                        while not task.done() and (time.time() - start_time) < timeout:
                            time.sleep(0.1)
                        
                        if task.done():
                            result = task.result()
                            self.evaluation_result = result
                        else:
                            print(f"[FLOWER CLIENT] Evaluation timeout - using fallback values")
                            task.cancel()
                            self.evaluation_result = {
                                "loss": 0.0,
                                "accuracy": 0.0,
                                "num_examples": EVAL_SAMPLES,
                                "metrics": {"accuracy": 0.0}
                            }
                    else:
                        # Not in event loop, create new one
                        self.evaluation_result = asyncio.run(
                            self._async_evaluate_operations(parameters, ins.config or {})
                        )
                        
                except Exception as e:
                    print(f"[FLOWER CLIENT] Error in evaluation operations: {e}")
                    self.evaluation_result = {
                        "loss": 0.0,
                        "accuracy": 0.0,
                        "num_examples": EVAL_SAMPLES,
                        "metrics": {"accuracy": 0.0}
                    }
            else:
                print(f"[FLOWER CLIENT] No message handler or send_to_mobile function available - using fallback values")
                self.evaluation_result = {
                    "loss": 0.0,
                    "accuracy": 0.0,
                    "num_examples": EVAL_SAMPLES,
                    "metrics": {"accuracy": 0.0}
                }
            
            # Return evaluation results
            if self.evaluation_result:
                loss = self.evaluation_result["loss"]
                num_examples = self.evaluation_result["num_examples"]
                metrics = self.evaluation_result["metrics"]
                
                print(f"[FLOWER CLIENT] Returning evaluation results:")
                print(f"[FLOWER CLIENT]   Loss: {loss}")
                print(f"[FLOWER CLIENT]   Num examples: {num_examples}")
                print(f"[FLOWER CLIENT]   Metrics: {metrics}")
                
                status = Status(code=Code.OK, message="Success")
                return EvaluateRes(
                    status=status,
                    loss=float(loss),
                    num_examples=int(num_examples),
                    metrics=metrics
                )
            else:
                print(f"[FLOWER CLIENT] No evaluation result available - using fallback")
                status = Status(code=Code.OK, message="Success")
                return EvaluateRes(
                    status=status,
                    loss=0.0,
                    num_examples=EVAL_SAMPLES,
                    metrics={"accuracy": 0.0}
                )
                
        except Exception as e:
            print(f"[FLOWER CLIENT] Evaluation failed: {e}")
            logger.error(f"Evaluation failed for {self.mobile_client_id}: {e}")
            import traceback
            traceback.print_exc()
            # Return fallback values
            status = Status(code=Code.OK, message="Success")
            return EvaluateRes(
                status=status,
                loss=0.0,
                num_examples=EVAL_SAMPLES,
                metrics={"accuracy": 0.0}
            )
        
    def set_mobile_weights(self, weights: List[Dict]) -> None:
        """Set weights received from mobile client"""
        try:
            print(f"[FLOWER CLIENT] Setting mobile weights for {self.mobile_client_id}")
            print(f"[FLOWER CLIENT] Received {len(weights)} weight objects")
            
            # Validate input weights
            if weights and len(weights) > 0:
                first_weight = weights[0]
                print(f"[FLOWER CLIENT] First weight object: type={type(first_weight)}, keys={list(first_weight.keys()) if isinstance(first_weight, dict) else 'N/A'}")
            
            # Convert TF.js weights to Python TF format
            print(f"[FLOWER CLIENT] Starting conversion from TF.js to Python TF format")
            self.current_weights = ModelConverter.tfjs_to_tf_weights(weights)
            
            print(f"[FLOWER CLIENT] Successfully converted to {len(self.current_weights)} tensors")
            
            # Validate converted weights
            if self.current_weights and len(self.current_weights) > 0:
                first_tensor = self.current_weights[0]
                print(f"[FLOWER CLIENT] First converted tensor: type={type(first_tensor)}, shape={getattr(first_tensor, 'shape', 'N/A')}, dtype={getattr(first_tensor, 'dtype', 'N/A')}")
            
            logger.info(f"Successfully updated weights from mobile client {self.mobile_client_id}")
            
        except Exception as e:
            logger.error(f"CRITICAL: Failed to set mobile weights for {self.mobile_client_id}: {e}")
            print(f"[FLOWER CLIENT] CRITICAL ERROR: Failed to set mobile weights: {e}")
            print(f"[FLOWER CLIENT] Weight setting details:")
            print(f"[FLOWER CLIENT]   - input count: {len(weights) if weights else 0}")
            print(f"[FLOWER CLIENT]   - input type: {type(weights)}")
            if weights and len(weights) > 0:
                print(f"[FLOWER CLIENT]   - first weight: {type(weights[0])}")
            import traceback
            traceback.print_exc()
            raise Exception(f"Failed to convert mobile weights: {e}")
            
    def complete_training(self, result: Dict) -> None:
        """Called when mobile client completes training"""
        try:
            num_samples = result.get("num_samples", 0)
            metrics = result.get("metrics", {})
            
            print(f"[FLOWER CLIENT] Training completed by mobile client {self.mobile_client_id}")
            print(f"[FLOWER CLIENT] Result: {num_samples} samples, metrics: {metrics}")
            
            # Validate num_samples
            if num_samples <= 0:
                print(f"[FLOWER CLIENT] Warning: num_samples is {num_samples}, should be > 0")
                logger.warning(f"num_samples is {num_samples} for client {self.mobile_client_id}")
            
            # Convert weights
            raw_weights = result.get("weights", [])
            print(f"[FLOWER CLIENT] Converting {len(raw_weights)} weight objects from training result")
            
            try:
                if raw_weights and len(raw_weights) > 0:
                    first_raw = raw_weights[0]
                    print(f"[FLOWER CLIENT] First raw weight: type={type(first_raw)}, keys={list(first_raw.keys()) if isinstance(first_raw, dict) else 'N/A'}")
                
                weights = ModelConverter.tfjs_to_tf_weights(raw_weights)
                print(f"[FLOWER CLIENT] Successfully converted {len(weights)} weight layers")
                
                # Validate converted weights
                if weights and len(weights) > 0:
                    first_converted = weights[0]
                    print(f"[FLOWER CLIENT] First converted weight: type={type(first_converted)}, shape={getattr(first_converted, 'shape', 'N/A')}")
                    
            except Exception as e:
                logger.error(f"Failed to convert training result weights: {e}")
                print(f"[FLOWER CLIENT] ERROR: Failed to convert training result weights: {e}")
                print(f"[FLOWER CLIENT] Raw weights details: count={len(raw_weights)}, type={type(raw_weights)}")
                import traceback
                traceback.print_exc()
                # Don't raise here - set empty weights as fallback
                weights = []
            
            self.training_result = {
                "weights": weights,
                "num_samples": num_samples,
                "metrics": metrics
            }
            self.training_finished.set()
            print(f"[FLOWER CLIENT] Training result set and event triggered")
            logger.info(f"Training completed by mobile client {self.mobile_client_id}")
        except Exception as e:
            print(f"[FLOWER CLIENT] Error completing training: {e}")
            logger.error(f"Error completing training: {e}")
            self.training_finished.set()  # Set event to unblock fit()
            
    def complete_evaluation(self, result: Dict) -> None:
        """Called when mobile client completes evaluation"""
        try:
            loss = result.get("loss", 0.0)
            accuracy = result.get("accuracy", 0.0)
            num_examples = result.get("num_examples", EVAL_SAMPLES)
            metrics = result.get("metrics", {})
            
            print(f"[FLOWER CLIENT] Evaluation completed by mobile client {self.mobile_client_id}")
            print(f"[FLOWER CLIENT] Result: loss={loss}, accuracy={accuracy}, num_examples={num_examples}")
            
            # Validate num_examples
            if num_examples <= 0:
                print(f"[FLOWER CLIENT] Warning: num_examples is {num_examples}, using default {EVAL_SAMPLES}")
                num_examples = EVAL_SAMPLES
            
            self.evaluation_result = {
                "loss": float(loss),
                "accuracy": float(accuracy),
                "num_examples": int(num_examples),
                "metrics": metrics
            }
            self.evaluation_finished.set()
            print(f"[FLOWER CLIENT] Evaluation result set and event triggered")
            logger.info(f"Evaluation completed by mobile client {self.mobile_client_id}")
        except Exception as e:
            print(f"[FLOWER CLIENT] Error completing evaluation: {e}")
            logger.error(f"Error completing evaluation: {e}")
            # Set fallback result and trigger event
            self.evaluation_result = {
                "loss": 0.0,
                "accuracy": 0.0,
                "num_examples": EVAL_SAMPLES,
                "metrics": {"accuracy": 0.0}
            }
            self.evaluation_finished.set()  # Set event to unblock evaluate()
