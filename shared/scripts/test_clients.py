#!/usr/bin/env python3
"""
Test Clients for FedMob
Creates multiple test clients to simulate federated learning
"""

import numpy as np
import pickle
import os
import sys
import time
import threading
from typing import Dict, List, Tuple, Optional
import logging

# Add the parent directory to the path to import server modules
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'flower-server'))

try:
    import flwr as fl
    from model_utils import ModelSerializer, MNISTModelUtils
except ImportError as e:
    print(f"Error importing Flower modules: {e}")
    print("Make sure to install Flower dependencies first")
    sys.exit(1)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TestMNISTClient(fl.client.NumPyClient):
    """Test MNIST client for federated learning"""
    
    def __init__(self, client_id: str, data_path: str):
        self.client_id = client_id
        self.data_path = data_path
        self.X_train = None
        self.y_train = None
        self.X_test = None
        self.y_test = None
        self.model_weights = None
        
        # Load client data
        self._load_data()
        
        # Initialize model weights (dummy for now)
        self._initialize_model_weights()
    
    def _load_data(self):
        """Load client-specific data"""
        try:
            with open(self.data_path, 'rb') as f:
                data = pickle.load(f)
            
            self.X_train = data['X']
            self.y_train = data['y']
            
            # For test purposes, use a subset of training data as test data
            test_size = min(100, len(self.X_train) // 4)
            self.X_test = self.X_train[:test_size]
            self.y_test = self.y_train[:test_size]
            
            logger.info(f"Client {self.client_id}: Loaded {len(self.X_train)} training samples, {len(self.X_test)} test samples")
            
        except Exception as e:
            logger.error(f"Error loading data for client {self.client_id}: {e}")
            raise
    
    def _initialize_model_weights(self):
        """Initialize model weights with random values"""
        # Create dummy weights for MNIST CNN
        expected_shapes = MNISTModelUtils.get_expected_weights_shape()
        self.model_weights = []
        
        for shape in expected_shapes:
            # Initialize with small random values
            weights = np.random.normal(0, 0.1, shape).astype(np.float32)
            self.model_weights.append(weights)
        
        logger.info(f"Client {self.client_id}: Initialized model weights")
    
    def get_parameters(self, config: Dict[str, str]) -> List[np.ndarray]:
        """Return current model parameters"""
        logger.info(f"Client {self.client_id}: Returning parameters")
        return self.model_weights
    
    def set_parameters(self, parameters: List[np.ndarray]) -> None:
        """Update model parameters"""
        logger.info(f"Client {self.client_id}: Setting parameters")
        self.model_weights = parameters
    
    def fit(self, parameters: List[np.ndarray], config: Dict[str, str]) -> Tuple[List[np.ndarray], int, Dict[str, float]]:
        """Train model on local data"""
        logger.info(f"Client {self.client_id}: Starting training...")
        
        # Set parameters
        self.set_parameters(parameters)
        
        # Simulate training (in real implementation, this would be actual training)
        epochs = int(config.get("epochs", 1))
        batch_size = int(config.get("batch_size", 32))
        learning_rate = float(config.get("learning_rate", 0.01))
        
        logger.info(f"Client {self.client_id}: Training for {epochs} epochs, batch_size={batch_size}, lr={learning_rate}")
        
        # Simulate training by adding small random noise to weights
        for epoch in range(epochs):
            for i, weight in enumerate(self.model_weights):
                # Add small random noise to simulate learning
                noise = np.random.normal(0, 0.01, weight.shape).astype(np.float32)
                self.model_weights[i] = weight + noise * learning_rate
        
        # Calculate training metrics (simulated)
        num_samples = len(self.X_train)
        training_loss = np.random.uniform(0.1, 0.5)  # Simulated loss
        training_accuracy = np.random.uniform(0.8, 0.95)  # Simulated accuracy
        
        metrics = {
            "training_loss": training_loss,
            "training_accuracy": training_accuracy,
            "samples_used": num_samples
        }
        
        logger.info(f"Client {self.client_id}: Training completed - Loss: {training_loss:.4f}, Accuracy: {training_accuracy:.4f}")
        
        return self.model_weights, num_samples, metrics
    
    def evaluate(self, parameters: List[np.ndarray], config: Dict[str, str]) -> Tuple[float, int, Dict[str, float]]:
        """Evaluate model on local test data"""
        logger.info(f"Client {self.client_id}: Evaluating model...")
        
        # Set parameters
        self.set_parameters(parameters)
        
        # Simulate evaluation
        test_loss = np.random.uniform(0.1, 0.4)  # Simulated test loss
        test_accuracy = np.random.uniform(0.85, 0.95)  # Simulated test accuracy
        
        metrics = {
            "test_loss": test_loss,
            "test_accuracy": test_accuracy
        }
        
        logger.info(f"Client {self.client_id}: Evaluation completed - Loss: {test_loss:.4f}, Accuracy: {test_accuracy:.4f}")
        
        return test_loss, len(self.X_test), metrics

def create_test_client(client_id: str, data_path: str, server_address: str = "localhost:8080"):
    """Create and start a test client"""
    logger.info(f"Starting test client {client_id}...")
    
    try:
        # Create client
        client = TestMNISTClient(client_id, data_path)
        
        # Start client
        fl.client.start_numpy_client(
            server_address=server_address,
            client=client
        )
        
    except Exception as e:
        logger.error(f"Error starting client {client_id}: {e}")

def main():
    """Main function to start multiple test clients"""
    logger.info("Starting FedMob test clients...")
    
    # Check if data files exist
    data_dir = "../data"
    if not os.path.exists(data_dir):
        logger.error(f"Data directory {data_dir} not found. Run setup_data.py first.")
        return
    
    # Find available client data files
    client_files = []
    for i in range(5):  # Look for up to 5 clients
        client_file = os.path.join(data_dir, f"client_{i}_data.pkl")
        if os.path.exists(client_file):
            client_files.append(client_file)
    
    if not client_files:
        logger.error("No client data files found. Run setup_data.py first.")
        return
    
    logger.info(f"Found {len(client_files)} client data files")
    
    # Start clients in separate threads
    threads = []
    for i, client_file in enumerate(client_files):
        client_id = f"test_client_{i}"
        thread = threading.Thread(
            target=create_test_client,
            args=(client_id, client_file),
            daemon=True
        )
        thread.start()
        threads.append(thread)
        
        # Small delay between client starts
        time.sleep(1)
    
    logger.info(f"Started {len(threads)} test clients")
    logger.info("Clients are running. Press Ctrl+C to stop.")
    
    try:
        # Keep main thread alive
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("Stopping test clients...")
        # Threads will be daemon threads, so they'll stop when main exits

if __name__ == "__main__":
    main()
