"""
Custom aggregation strategies for FedMob
"""

import flwr as fl
import numpy as np
from typing import List, Tuple, Dict, Optional
import logging

logger = logging.getLogger(__name__)

class MobileOptimizedFedAvg(fl.server.strategy.FedAvg):
    """FedAvg strategy optimized for mobile devices"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.client_weights_history = {}
        self.round_metrics = {}
    
    def aggregate_fit(self, server_round: int, results: List[Tuple], failures: List) -> Tuple[Optional[Dict], Dict]:
        """Aggregate training results with mobile-specific optimizations"""
        if not results:
            logger.warning("No results to aggregate")
            return None, {}
        
        # Filter out failed clients
        valid_results = []
        total_samples = 0
        
        for (client_id, weights, num_examples) in results:
            if weights is not None and num_examples > 0:
                valid_results.append((client_id, weights, num_examples))
                total_samples += num_examples
                
                # Store client weights for analysis
                self.client_weights_history[client_id] = {
                    'round': server_round,
                    'samples': num_examples,
                    'weights_shape': [w.shape for w in weights]
                }
        
        if not valid_results:
            logger.warning("No valid results to aggregate")
            return None, {}
        
        # Perform weighted aggregation
        aggregated_weights = self._weighted_averaging(valid_results)
        
        # Store round metrics
        self.round_metrics[server_round] = {
            'num_clients': len(valid_results),
            'total_samples': total_samples,
            'avg_samples_per_client': total_samples / len(valid_results)
        }
        
        logger.info(f"Round {server_round}: Aggregated from {len(valid_results)} clients, {total_samples} total samples")
        
        return aggregated_weights, {"total_samples": total_samples}
    
    def _weighted_averaging(self, results: List[Tuple]) -> List[np.ndarray]:
        """Perform weighted averaging of model parameters"""
        # Calculate total samples
        total_samples = sum(num_examples for _, _, num_examples in results)
        
        # Initialize aggregated weights
        aggregated_weights = []
        num_layers = len(results[0][1])  # Number of layers in the model
        
        for layer_idx in range(num_layers):
            # Initialize layer weights
            layer_shape = results[0][1][layer_idx].shape
            weighted_layer = np.zeros(layer_shape, dtype=np.float32)
            
            # Weighted sum
            for _, weights, num_examples in results:
                weight = num_examples / total_samples
                weighted_layer += weight * weights[layer_idx]
            
            aggregated_weights.append(weighted_layer)
        
        return aggregated_weights
    
    def configure_fit(self, server_round: int, parameters, client_manager) -> List[Tuple]:
        """Configure training for each client"""
        # Get available clients
        clients = client_manager.sample(
            num_clients=self.min_fit_clients,
            min_num_clients=self.min_available_clients
        )
        
        # Create configuration for each client
        configs = []
        for client in clients:
            config = {
                "round": str(server_round),
                "epochs": "1",  # Single epoch for mobile efficiency
                "batch_size": "32",
                "learning_rate": "0.01",
                "client_id": str(client.cid)
            }
            configs.append((client, config))
        
        logger.info(f"Round {server_round}: Configuring {len(configs)} clients for training")
        return configs
    
    def configure_evaluate(self, server_round: int, parameters, client_manager) -> List[Tuple]:
        """Configure evaluation for each client"""
        # Get available clients
        clients = client_manager.sample(
            num_clients=self.min_evaluate_clients,
            min_num_clients=self.min_available_clients
        )
        
        # Create configuration for each client
        configs = []
        for client in clients:
            config = {
                "round": str(server_round),
                "batch_size": "32",
                "client_id": str(client.cid)
            }
            configs.append((client, config))
        
        logger.info(f"Round {server_round}: Configuring {len(configs)} clients for evaluation")
        return configs
