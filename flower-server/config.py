"""
Configuration settings for FedMob Flower Server
"""

import os
from typing import Dict, Any

class ServerConfig:
    """Server configuration settings"""
    
    # Server settings
    HOST = "0.0.0.0"  # Listen on all interfaces for mobile access
    PORT = 8080
    ADDRESS = f"{HOST}:{PORT}"
    
    # Federated learning settings
    NUM_ROUNDS = 3
    MIN_AVAILABLE_CLIENTS = 2
    MIN_FIT_CLIENTS = 2
    MIN_EVALUATE_CLIENTS = 2
    
    # Training settings - ALL TRAINING PARAMETERS CONTROLLED FROM HERE
    EPOCHS_PER_ROUND = 1  # Number of epochs clients train per round
    BATCH_SIZE = 32
    LEARNING_RATE = 0.01
    EVAL_SAMPLES = 100  # Number of samples to report for evaluation (matches training data size)
    
    # Model settings
    MODEL_NAME = "mnist_cnn"
    MODEL_VARIANT = "lenet"  # Options: 'lenet', 'basic', 'opt-125m'
    INPUT_SHAPE = (28, 28, 1)
    NUM_CLASSES = 10
    
    # Supported model variants
    SUPPORTED_MODELS = {
        "lenet": "LeNet-5 CNN architecture (simple, fast)",
        "basic": "Basic CNN (minimal architecture)",
        "opt-125m": "OPT-125M transformer (large, advanced)"
    }
    
    # Logging settings
    LOG_LEVEL = "INFO"
    LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # Mobile optimization settings
    MAX_CLIENT_WAIT_TIME = 300  # 5 minutes
    CLIENT_TIMEOUT = 60  # 1 minute
    MAX_MESSAGE_SIZE = 10 * 1024 * 1024  # 10MB
    
    @classmethod
    def get_training_config(cls, round_num: int) -> Dict[str, Any]:
        """Get training configuration for a specific round
        
        All training parameters flow from here to clients
        Ensures consistency across all devices
        """
        return {
            "round": round_num,
            "epochs": cls.EPOCHS_PER_ROUND,
            "batch_size": cls.BATCH_SIZE,
            "learning_rate": cls.LEARNING_RATE,
            "model_name": cls.MODEL_NAME,
            "model_variant": cls.MODEL_VARIANT,  # CRITICAL: Ensures all clients use same model
        }
    
    @classmethod
    def get_evaluation_config(cls, round_num: int) -> Dict[str, Any]:
        """Get evaluation configuration for a specific round"""
        return {
            "round": round_num,
            "batch_size": cls.BATCH_SIZE,
            "model_name": cls.MODEL_NAME,
            "model_variant": cls.MODEL_VARIANT,
        }
    
    @classmethod
    def get_server_config(cls) -> Dict[str, Any]:
        """Get server configuration"""
        return {
            "host": cls.HOST,
            "port": cls.PORT,
            "address": cls.ADDRESS,
            "num_rounds": cls.NUM_ROUNDS,
            "min_available_clients": cls.MIN_AVAILABLE_CLIENTS,
            "min_fit_clients": cls.MIN_FIT_CLIENTS,
            "min_evaluate_clients": cls.MIN_EVALUATE_CLIENTS
        }

class ClientConfig:
    """Client configuration settings"""
    
    # Connection settings
    SERVER_HOST = "192.168.1.100"  # Replace with your laptop's IP address
    SERVER_PORT = 8080
    SERVER_ADDRESS = f"{SERVER_HOST}:{SERVER_PORT}"
    
    # Training settings
    BATCH_SIZE = 32
    LEARNING_RATE = 0.01
    EPOCHS = 1
    
    # Model settings
    MODEL_NAME = "mnist_cnn"
    INPUT_SHAPE = (28, 28, 1)
    NUM_CLASSES = 10
    
    # Data settings
    DATA_DIR = "data"
    MNIST_DATA_FILE = "mnist_data.pkl"
    
    # Mobile settings
    MAX_TRAINING_TIME = 300  # 5 minutes
    SAVE_MODEL_INTERVAL = 1  # Save after each epoch
    
    @classmethod
    def get_client_config(cls) -> Dict[str, Any]:
        """Get client configuration"""
        return {
            "server_address": cls.SERVER_ADDRESS,
            "batch_size": cls.BATCH_SIZE,
            "learning_rate": cls.LEARNING_RATE,
            "epochs": cls.EPOCHS,
            "model_name": cls.MODEL_NAME,
            "max_training_time": cls.MAX_TRAINING_TIME
        }

# Environment-specific configurations
class DevelopmentConfig(ServerConfig):
    """Development environment configuration"""
    LOG_LEVEL = "DEBUG"
    NUM_ROUNDS = 2
    MIN_AVAILABLE_CLIENTS = 1

class ProductionConfig(ServerConfig):
    """Production environment configuration"""
    LOG_LEVEL = "WARNING"
    NUM_ROUNDS = 10
    MIN_AVAILABLE_CLIENTS = 3

# Get configuration based on environment
def get_config() -> ServerConfig:
    """Get configuration based on environment variable"""
    env = os.getenv("FEDMOB_ENV", "development").lower()
    
    if env == "production":
        return ProductionConfig()
    else:
        return DevelopmentConfig()
