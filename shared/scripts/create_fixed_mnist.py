#!/usr/bin/env python3
"""
Create Fixed MNIST Dataset for FedMob
Extracts 10 samples per class for training and 2 samples per class for testing
Exports as JSON files for React Native compatibility
"""

import numpy as np
import json
import os
from sklearn.model_selection import train_test_split
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

def create_fixed_dataset(X, y, train_samples_per_class=10, test_samples_per_class=2, random_state=42):
    """Create fixed dataset with specified samples per class"""
    logger.info(f"Creating fixed dataset: {train_samples_per_class} train + {test_samples_per_class} test per class")
    
    np.random.seed(random_state)
    train_samples = []
    test_samples = []
    
    for class_label in range(10):  # Classes 0-9
        # Get all samples for this class
        class_indices = np.where(y == class_label)[0]
        
        if len(class_indices) < train_samples_per_class + test_samples_per_class:
            logger.warning(f"Not enough samples for class {class_label}, using all {len(class_indices)} available")
            available_samples = len(class_indices)
            train_count = min(train_samples_per_class, available_samples // 2)
            test_count = min(test_samples_per_class, available_samples - train_count)
        else:
            train_count = train_samples_per_class
            test_count = test_samples_per_class
        
        # Shuffle indices for this class
        shuffled_indices = np.random.permutation(class_indices)
        
        # Select training samples
        train_class_indices = shuffled_indices[:train_count]
        for idx in train_class_indices:
            train_samples.append({
                'data': X[idx].tolist(),  # Convert to list for JSON serialization
                'label': int(y[idx])
            })
        
        # Select test samples (different from training)
        test_class_indices = shuffled_indices[train_count:train_count + test_count]
        for idx in test_class_indices:
            test_samples.append({
                'data': X[idx].tolist(),  # Convert to list for JSON serialization
                'label': int(y[idx])
            })
        
        logger.info(f"Class {class_label}: {train_count} train, {test_count} test samples")
    
    return train_samples, test_samples

def normalize_data(samples):
    """Normalize pixel values to [0, 1] range"""
    logger.info("Normalizing pixel values to [0, 1] range...")
    
    for sample in samples:
        # Convert to numpy array, normalize, convert back to list
        data = np.array(sample['data'], dtype=np.float32)
        data = data / 255.0
        sample['data'] = data.tolist()
    
    return samples

def save_json_dataset(samples, filepath):
    """Save dataset as JSON file"""
    logger.info(f"Saving dataset to {filepath}...")
    
    # Create directory if it doesn't exist
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    # Create dataset structure
    dataset = {
        'samples': samples,
        'metadata': {
            'total_samples': len(samples),
            'image_size': 784,  # 28x28 flattened
            'num_classes': 10,
            'class_distribution': {}
        }
    }
    
    # Calculate class distribution
    for sample in samples:
        label = sample['label']
        if label not in dataset['metadata']['class_distribution']:
            dataset['metadata']['class_distribution'][str(label)] = 0
        dataset['metadata']['class_distribution'][str(label)] += 1
    
    # Save to JSON file
    with open(filepath, 'w') as f:
        json.dump(dataset, f, indent=2)
    
    logger.info(f"Dataset saved successfully: {len(samples)} samples")
    return dataset

def main():
    """Main function to create fixed MNIST datasets"""
    logger.info("Starting fixed MNIST dataset creation...")
    
    # Load raw MNIST data
    X, y = load_mnist_data()
    
    # Normalize pixel values to [0, 1]
    X = X.astype(np.float32) / 255.0
    
    # Create fixed datasets
    train_samples, test_samples = create_fixed_dataset(
        X, y, 
        train_samples_per_class=50, 
        test_samples_per_class=20,
        random_state=42
    )
    
    # Define output paths - use absolute path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(os.path.dirname(script_dir))  # Go up two levels from shared/scripts
    mobile_assets_dir = os.path.join(project_root, "MobileClient", "src", "assets", "mnist-data")
    train_file = os.path.join(mobile_assets_dir, "mnist_train_100.json")
    test_file = os.path.join(mobile_assets_dir, "mnist_test_20.json")
    
    logger.info(f"Output directory: {mobile_assets_dir}")
    logger.info(f"Training file: {train_file}")
    logger.info(f"Test file: {test_file}")
    
    # Save datasets
    train_dataset = save_json_dataset(train_samples, train_file)
    test_dataset = save_json_dataset(test_samples, test_file)
    
    # Print summary
    logger.info("=" * 50)
    logger.info("FIXED MNIST DATASET CREATION COMPLETED")
    logger.info("=" * 50)
    logger.info(f"Training dataset: {train_file}")
    logger.info(f"  - Total samples: {len(train_samples)}")
    logger.info(f"  - Class distribution: {train_dataset['metadata']['class_distribution']}")
    logger.info(f"Test dataset: {test_file}")
    logger.info(f"  - Total samples: {len(test_samples)}")
    logger.info(f"  - Class distribution: {test_dataset['metadata']['class_distribution']}")
    logger.info("=" * 50)

if __name__ == "__main__":
    main()
