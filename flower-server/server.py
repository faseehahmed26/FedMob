#!/usr/bin/env python3
"""
FedMob Flower Server
Basic Flower server with FedAvg strategy for federated learning coordination
"""

import flwr as fl
import numpy as np
from typing import List, Tuple, Dict, Optional
import logging
from config import ServerConfig
import tensorflow as tf
from tensorflow import keras
from model_utils import MNISTModelUtils

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FedMobServer:
    """FedMob Flower Server with FedAvg strategy"""
    
    def __init__(self, num_rounds: int = 3, min_available_clients: int = 2):
        self.num_rounds = num_rounds
        self.min_available_clients = min_available_clients
        self.current_round = 0
        
    def fit_config(self, server_round: int) -> Dict[str, str]:
        """Return training configuration for each round
        
        All config flows from ServerConfig to ensure consistency
        """
        # Get config from centralized configuration
        config_dict = ServerConfig.get_training_config(server_round)
        
        # Convert all values to strings for Flower serialization
        config = {k: str(v) for k, v in config_dict.items()}
        
        logger.info(f"Round {server_round}: Sending config {config}")
        return config
    
    def evaluate_config(self, server_round: int) -> Dict[str, str]:
        """Return evaluation configuration for each round
        
        All config flows from ServerConfig to ensure consistency
        """
        # Get config from centralized configuration
        config_dict = ServerConfig.get_evaluation_config(server_round)
        
        # Convert all values to strings for Flower serialization
        config = {k: str(v) for k, v in config_dict.items()}
        
        return config
    
    def aggregate_fit(self, server_round: int, results: List[Tuple], failures: List) -> Tuple[Optional[Dict], Dict]:
        """Aggregate training results using FedAvg"""
        logger.info(f"[FEDAVG] Round {server_round}: Starting aggregation")
        logger.info(f"[FEDAVG] Received {len(results)} results, {len(failures)} failures")
        
        if not results:
            logger.warning("No results to aggregate")
            return None, {}
        
        # Extract weights from results
        weights_results = []
        total_samples = 0
        
        for (client_id, weights, num_examples) in results:
            if weights is not None and num_examples > 0:
                weights_results.append((weights, num_examples))
                total_samples += num_examples
                logger.info(f"📊 [FEDAVG] Client {client_id}: {num_examples} samples, {len(weights)} weight layers")
            else:
                logger.warning(f"⚠️ [FEDAVG] Client {client_id}: Invalid result (weights={weights is not None}, samples={num_examples})")
        
        if not weights_results:
            logger.warning("No valid weights to aggregate")
            return None, {}
        
        # Validate all weights have same structure
        first_num_layers = len(weights_results[0][0])
        for weights, num_examples in weights_results:
            if len(weights) != first_num_layers:
                logger.error(f"[FEDAVG] Weight structure mismatch: expected {first_num_layers} layers")
                return None, {}
        
        # Perform FedAvg aggregation
        logger.info(f"[FEDAVG] Aggregating {len(weights_results)} clients with {total_samples} total samples")
        aggregated_weights = self._federated_averaging(weights_results)
        
        # Log aggregation results
        logger.info(f"[FEDAVG] Round {server_round}: Aggregated {len(aggregated_weights)} weight layers from {len(weights_results)} clients")
        logger.info(f"[FEDAVG] Total samples used: {total_samples}")
        
        return aggregated_weights, {"total_samples": total_samples}
    
    def _federated_averaging(self, weights_results: List[Tuple]) -> List[np.ndarray]:
        """Perform federated averaging on the weights"""
        # Calculate weighted average
        weighted_weights = []
        total_samples = sum(num_examples for _, num_examples in weights_results)
        
        logger.info(f"[FEDAVG] Computing weighted average with {total_samples} total samples")
        
        num_layers = len(weights_results[0][0])
        for layer_idx in range(num_layers):
            weighted_layer = np.zeros_like(weights_results[0][0][layer_idx])
            
            for weights, num_examples in weights_results:
                weight_factor = num_examples / total_samples
                weighted_layer += weight_factor * weights[layer_idx]
                logger.debug(f"[FEDAVG] Layer {layer_idx}: added {num_examples}/{total_samples} = {weight_factor:.4f} weight")
            
            weighted_weights.append(weighted_layer)
            logger.debug(f"[FEDAVG] Layer {layer_idx}: aggregated shape {weighted_layer.shape}")
        
        logger.info(f"[FEDAVG] Completed aggregation of {len(weighted_weights)} layers")
        return weighted_weights
    
    def aggregate_evaluate(self, server_round: int, results: List[Tuple], failures: List) -> Tuple[Optional[float], Dict]:
        """Aggregate evaluation results"""
        if not results:
            logger.warning("No evaluation results to aggregate")
            return None, {}
        
        # Calculate weighted average of metrics
        total_samples = 0
        weighted_loss = 0.0
        weighted_accuracy = 0.0
        
        for (client_id, loss, num_examples, metrics) in results:
            if loss is not None:
                weighted_loss += loss * num_examples
                total_samples += num_examples
                
                if metrics and "accuracy" in metrics:
                    weighted_accuracy += metrics["accuracy"] * num_examples
                
                logger.info(f"Client {client_id}: loss={loss:.4f}, accuracy={metrics.get('accuracy', 0):.4f}, samples={num_examples}")
        
        if total_samples == 0:
            return None, {}
        
        avg_loss = weighted_loss / total_samples
        avg_accuracy = weighted_accuracy / total_samples
        
        logger.info(f"Round {server_round}: Average loss={avg_loss:.4f}, Average accuracy={avg_accuracy:.4f}")
        
        return avg_loss, {"accuracy": avg_accuracy, "total_samples": total_samples}
    
    def _create_lenet_model(self) -> keras.Model:
        """Create LeNet model matching the client architecture"""
        model = keras.Sequential([
            keras.layers.Conv2D(6, (5, 5), activation='relu', padding='valid', input_shape=(28, 28, 1)),
            keras.layers.MaxPooling2D(pool_size=(2, 2), strides=(2, 2)),
            keras.layers.Conv2D(16, (5, 5), activation='relu', padding='valid'),
            keras.layers.MaxPooling2D(pool_size=(2, 2), strides=(2, 2)),
            keras.layers.Flatten(),
            keras.layers.Dense(120, activation='relu'),
            keras.layers.Dense(84, activation='relu'),
            keras.layers.Dense(10, activation='softmax')
        ])
        
        model.compile(
            optimizer='adam',
            loss='sparse_categorical_crossentropy',
            metrics=['accuracy']
        )
        
        return model
    
    def _load_mnist_test_data(self) -> Tuple[np.ndarray, np.ndarray]:
        """Load MNIST test dataset for server-side evaluation"""
        try:
            # Load MNIST dataset
            (_, _), (x_test, y_test) = keras.datasets.mnist.load_data()
            
            # Normalize pixel values to [0, 1]
            x_test = x_test.astype('float32') / 255.0
            
            # Add channel dimension for grayscale
            x_test = np.expand_dims(x_test, axis=-1)
            
            logger.info(f"Loaded MNIST test data: {x_test.shape}, {y_test.shape}")
            return x_test, y_test
            
        except Exception as e:
            logger.error(f"Error loading MNIST test data: {e}")
            raise
    
    def _flower_parameters_to_weights(self, parameters) -> List[np.ndarray]:
        """Convert Flower parameters format to TensorFlow weights"""
        try:
            # Flower parameters are typically in list format
            if isinstance(parameters, list):
                weights = []
                for param in parameters:
                    if isinstance(param, np.ndarray):
                        weights.append(param)
                    else:
                        # Convert to numpy array if needed
                        weights.append(np.array(param))
                return weights
            else:
                logger.error(f"Unexpected parameters format: {type(parameters)}")
                return []
        except Exception as e:
            logger.error(f"Error converting parameters to weights: {e}")
            return []
    
    def evaluate(self, server_round: int, parameters, config: Dict[str, str]) -> Tuple[float, Dict]:
        """Global evaluation using centralized test dataset"""
        print(f"[FLOWER SERVER] evaluate called for round {server_round}")
        print(f"[FLOWER SERVER] Parameters type: {type(parameters)}")
        print(f"[FLOWER SERVER] Config: {config}")
        
        try:
            # Handle case where no parameters are provided (initial round)
            if parameters is None or len(parameters) == 0:
                logger.warning("No parameters provided for evaluation, returning dummy values")
                return 0.0, {"accuracy": 0.0}
            
            # Create LeNet model
            logger.info("Creating LeNet model for server-side evaluation...")
            model = self._create_lenet_model()
            
            # Convert Flower parameters to TensorFlow weights
            logger.info("Converting Flower parameters to TensorFlow weights...")
            weights = self._flower_parameters_to_weights(parameters)
            
            if not weights:
                logger.warning("Failed to convert parameters to weights, returning dummy values")
                return 0.0, {"accuracy": 0.0}
            
            # Validate weights match model architecture
            if len(weights) != len(model.get_weights()):
                logger.error(f"Weight count mismatch: model expects {len(model.get_weights())} layers, got {len(weights)}")
                return 0.0, {"accuracy": 0.0}
            
            # Validate using model utils
            if not MNISTModelUtils.validate_mnist_weights(weights, variant="lenet"):
                logger.warning("Weight validation failed, but proceeding with evaluation")
            
            # Set weights to model
            logger.info("Setting weights to model...")
            model.set_weights(weights)
            
            # Load test data (cache it for subsequent calls)
            if not hasattr(self, '_test_data'):
                logger.info("Loading MNIST test dataset...")
                self._test_data = self._load_mnist_test_data()
            
            x_test, y_test = self._test_data
            
            # Evaluate model on test data  
            logger.info(f"Evaluating model on {len(x_test)} test samples...")
            test_loss, test_accuracy = model.evaluate(x_test, y_test, verbose=0)
            
            logger.info(f"[FLOWER SERVER] Round {server_round} evaluation complete:")
            logger.info(f"[FLOWER SERVER]   Test Loss: {test_loss:.4f}")
            logger.info(f"[FLOWER SERVER]   Test Accuracy: {test_accuracy:.4f}")
            
            return float(test_loss), {"accuracy": float(test_accuracy)}
            
        except Exception as e:
            logger.error(f"[FLOWER SERVER] Evaluation failed for round {server_round}: {e}")
            logger.error(f"[FLOWER SERVER] Returning dummy values due to error")
            import traceback
            traceback.print_exc()
            return 0.0, {"accuracy": 0.0}

def main():
    """Start the Flower server"""
    logger.info("Starting FedMob Flower Server...")
    
    # Create server instance
    # For testing: allow 1 client. For production: use min_available_clients=2
    import os
    min_clients = int(os.getenv("MIN_CLIENTS", "1"))  # Default to 1 for testing
    logger.info(f"Configured for minimum {min_clients} clients (set MIN_CLIENTS env var to change)")
    server = FedMobServer(num_rounds=3, min_available_clients=min_clients)
    
    # Define strategy
    strategy = fl.server.strategy.FedAvg(
        min_available_clients=server.min_available_clients,
        min_fit_clients=server.min_available_clients,
        min_evaluate_clients=server.min_available_clients,
        on_fit_config_fn=server.fit_config,
        on_evaluate_config_fn=server.evaluate_config,
        evaluate_fn=server.evaluate,
    )
    
    # Start server
    logger.info("Server starting on 0.0.0.0:8080 (accessible from mobile devices)")
    logger.info(f"Waiting for {server.min_available_clients} clients...")
    logger.info("Make sure your laptop and phones are on the same WiFi network")
    
    fl.server.start_server(
        server_address="0.0.0.0:8080",
        config=fl.server.ServerConfig(num_rounds=server.num_rounds),
        strategy=strategy,
    )

if __name__ == "__main__":
    main()
