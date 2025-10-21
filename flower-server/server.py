#!/usr/bin/env python3
"""
FedMob Flower Server
Basic Flower server with FedAvg strategy for federated learning coordination
"""

import flwr as fl
import numpy as np
from typing import List, Tuple, Dict, Optional
import logging

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
        """Return training configuration for each round"""
        config = {
            "round": str(server_round),
            "epochs": "1",  # Single epoch per round for mobile efficiency
            "batch_size": "32",
            "learning_rate": "0.01",
            "model_variant": "basic",
        }
        logger.info(f"Round {server_round}: Sending config {config}")
        return config
    
    def evaluate_config(self, server_round: int) -> Dict[str, str]:
        """Return evaluation configuration for each round"""
        config = {
            "round": str(server_round),
            "batch_size": "32",
            "model_variant": "basic",
        }
        return config
    
    def aggregate_fit(self, server_round: int, results: List[Tuple], failures: List) -> Tuple[Optional[Dict], Dict]:
        """Aggregate training results using FedAvg"""
        if not results:
            logger.warning("No results to aggregate")
            return None, {}
        
        # Extract weights from results
        weights_results = []
        total_samples = 0
        
        for (client_id, weights, num_examples) in results:
            if weights is not None:
                weights_results.append((weights, num_examples))
                total_samples += num_examples
                logger.info(f"Client {client_id}: {num_examples} samples")
        
        if not weights_results:
            logger.warning("No valid weights to aggregate")
            return None, {}
        
        # Perform FedAvg aggregation
        aggregated_weights = self._federated_averaging(weights_results)
        
        # Log aggregation results
        logger.info(f"Round {server_round}: Aggregated weights from {len(weights_results)} clients")
        logger.info(f"Total samples: {total_samples}")
        
        return aggregated_weights, {"total_samples": total_samples}
    
    def _federated_averaging(self, weights_results: List[Tuple]) -> List[np.ndarray]:
        """Perform federated averaging on the weights"""
        # Calculate weighted average
        weighted_weights = []
        total_samples = sum(num_examples for _, num_examples in weights_results)
        
        for layer_idx in range(len(weights_results[0][0])):
            weighted_layer = np.zeros_like(weights_results[0][0][layer_idx])
            
            for weights, num_examples in weights_results:
                weight = num_examples / total_samples
                weighted_layer += weight * weights[layer_idx]
            
            weighted_weights.append(weighted_layer)
        
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
    
    def evaluate(self, server_round: int, parameters, config: Dict[str, str]) -> Tuple[float, Dict]:
        """Global evaluation (optional)"""
        print(f"🔍 [FLOWER SERVER] evaluate called for round {server_round}")
        print(f"🔍 [FLOWER SERVER] Parameters type: {type(parameters)}")
        print(f"🔍 [FLOWER SERVER] Config: {config}")
        
        # For now, return dummy values
        # In a real implementation, you might evaluate on a global test set
        return 0.0, {"accuracy": 0.0}

def main():
    """Start the Flower server"""
    logger.info("Starting FedMob Flower Server...")
    
    # Create server instance
    server = FedMobServer(num_rounds=3, min_available_clients=2)
    
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
