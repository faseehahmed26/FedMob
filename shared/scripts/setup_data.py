#!/usr/bin/env python3
"""
MNIST Dataset Setup for FedMob
Downloads and preprocesses MNIST data for federated learning
"""

import numpy as np
import pickle
import os
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def load_mnist_data():
    """Load MNIST data using sklearn or tensorflow"""
    try:
        # Try to load from sklearn first (faster)
        from sklearn.datasets import fetch_openml
        logger.info("Loading MNIST data from sklearn...")
        mnist = fetch_openml('mnist_784', version=1, as_frame=False)
        X, y = mnist.data, mnist.target.astype(int)
        logger.info(f"Loaded MNIST data: {X.shape[0]} samples, {X.shape[1]} features")
        return X, y
    except ImportError:
        # Fallback to tensorflow
        try:
            import tensorflow as tf
            logger.info("Loading MNIST data from TensorFlow...")
            (x_train, y_train), (x_test, y_test) = tf.keras.datasets.mnist.load_data()
            X = np.concatenate([x_train, x_test])
            y = np.concatenate([y_train, y_test])
            X = X.reshape(X.shape[0], -1)  # Flatten
            logger.info(f"Loaded MNIST data: {X.shape[0]} samples, {X.shape[1]} features")
            return X, y
        except ImportError:
            logger.error("Neither sklearn nor tensorflow available for loading MNIST data")
            raise

def preprocess_mnist_data(X, y, test_size=0.2, random_state=42):
    """Preprocess MNIST data for federated learning"""
    logger.info("Preprocessing MNIST data...")
    
    # Normalize pixel values to [0, 1]
    X = X.astype(np.float32) / 255.0
    
    # Reshape to (samples, height, width, channels) for CNN
    X = X.reshape(-1, 28, 28, 1)
    
    # Split into train and test sets
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, stratify=y
    )
    
    logger.info(f"Train set: {X_train.shape[0]} samples")
    logger.info(f"Test set: {X_test.shape[0]} samples")
    
    return X_train, X_test, y_train, y_test

def create_federated_datasets(X_train, y_train, num_clients=5, random_state=42):
    """Create federated datasets by splitting data among clients"""
    logger.info(f"Creating federated datasets for {num_clients} clients...")
    
    # Shuffle data
    np.random.seed(random_state)
    indices = np.random.permutation(len(X_train))
    X_shuffled = X_train[indices]
    y_shuffled = y_train[indices]
    
    # Split data among clients
    client_data = {}
    samples_per_client = len(X_train) // num_clients
    
    for i in range(num_clients):
        start_idx = i * samples_per_client
        if i == num_clients - 1:  # Last client gets remaining data
            end_idx = len(X_train)
        else:
            end_idx = (i + 1) * samples_per_client
        
        client_data[f"client_{i}"] = {
            "X": X_shuffled[start_idx:end_idx],
            "y": y_shuffled[start_idx:end_idx]
        }
        
        logger.info(f"Client {i}: {len(client_data[f'client_{i}']['X'])} samples")
    
    return client_data

def save_preprocessed_data(data, filepath):
    """Save preprocessed data to pickle file"""
    logger.info(f"Saving preprocessed data to {filepath}...")
    
    # Create directory if it doesn't exist
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    with open(filepath, 'wb') as f:
        pickle.dump(data, f)
    
    logger.info(f"Data saved successfully")

def main():
    """Main function to setup MNIST data"""
    logger.info("Starting MNIST data setup...")
    
    # Load raw MNIST data
    X, y = load_mnist_data()
    
    # Preprocess data
    X_train, X_test, y_train, y_test = preprocess_mnist_data(X, y)
    
    # Create federated datasets
    client_data = create_federated_datasets(X_train, y_train, num_clients=5)
    
    # Prepare data structure
    preprocessed_data = {
        "X_test": X_test,
        "y_test": y_test,
        "client_data": client_data,
        "metadata": {
            "num_clients": len(client_data),
            "input_shape": (28, 28, 1),
            "num_classes": 10,
            "total_train_samples": X_train.shape[0],
            "total_test_samples": X_test.shape[0]
        }
    }
    
    # Save preprocessed data
    data_file = "../data/mnist_preprocessed.pkl"
    save_preprocessed_data(preprocessed_data, data_file)
    
    # Also save individual client data for easy access
    for client_id, data in client_data.items():
        client_file = f"../data/{client_id}_data.pkl"
        save_preprocessed_data(data, client_file)
    
    logger.info("MNIST data setup completed successfully!")
    logger.info(f"Preprocessed data saved to: {data_file}")
    logger.info(f"Individual client data saved to: ../data/client_*_data.pkl")

if __name__ == "__main__":
    main()
