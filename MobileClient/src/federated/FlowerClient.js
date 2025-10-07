/**
 * Flower Client Implementation
 * Handles federated learning operations using WebSocket
 */

import WebSocketClient from './WebSocketClient';
import tensorFlowManager from '../utils/tensorflow';
import ModelSerializer from '../utils/modelSerializer';
import resourceMonitor from '../utils/resourceMonitor';
import TrainingEngine from './TrainingEngine';
import DatasetLoader from './DatasetLoader';

class FlowerClient {
  constructor(serverUrl, clientId) {
    this.clientId = clientId;
    this.wsClient = new WebSocketClient(serverUrl, clientId);
    this.model = null;
    this.currentRound = 0;
    this.trainingEngine = null;
    this.datasetLoader = null;

    // Event handlers (to be set by user)
    this.onRoundStart = null;
    this.onRoundComplete = null;
    this.onTrainingProgress = null;
    this.onError = null;

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // WebSocket connection events
    this.wsClient.onConnect = () => {
      console.log('Connected to server');
    };

    this.wsClient.onDisconnect = () => {
      console.log('Disconnected from server');
    };

    this.wsClient.onError = error => {
      console.error('Connection error:', error);
      if (this.onError) {
        this.onError(error);
      }
    };

    // Training events
    this.wsClient.onTrainingStart = async round => {
      this.currentRound = round;
      if (this.onRoundStart) {
        this.onRoundStart(round);
      }

      try {
        console.log(
          `[FL] onTrainingStart round=${round} - preparing model/data...`,
        );
        // Ensure TF ready and model/data prepared
        await tensorFlowManager.initialize();
        if (!this.model) {
          console.log('[FL] Creating MNIST model...');
          // this.model = tensorFlowManager.createMNISTModel({
          //   modelVariant: 'basic',
          // });
          this.model = tensorFlowManager.createMNISTModel({
            modelVariant: 'lenet',
          });
        }
        if (!this.datasetLoader) {
          this.datasetLoader = new DatasetLoader();
          console.log('[FL] Loading local dataset...');
          await this.datasetLoader.loadLocalData(this.clientId);
        }
        if (!this.trainingEngine) {
          console.log('[FL] Creating TrainingEngine instance...');
          this.trainingEngine = new TrainingEngine();
        }

        // Debug: reduce epochs for faster on-device iteration
        const totalEpochs = 2;
        const updateInterval = 1;
        this.trainingEngine.onEpochEnd = async ({
          epoch,
          epochs,
          progress,
          metrics,
        }) => {
          try {
            if ((epoch + 1) % updateInterval === 0) {
              // Send incremental progress
              await this.updateTrainingProgress(
                Math.min(1, (epoch + 1) / totalEpochs),
                metrics,
              );
              // Send per-interval weights
              await this.sendWeights();
              console.log(
                `Sent update at epoch ${
                  epoch + 1
                }/${totalEpochs} (every ${updateInterval} epochs)`,
              );
            }
          } catch (e) {
            console.warn('Failed to send periodic update:', e);
          }
        };

        // Train local model for one round
        console.log('[FL] Starting local training for 2 epochs (debug)...');
        const result = await this.trainingEngine.trainModel(
          this.model,
          this.datasetLoader.X_train,
          this.datasetLoader.y_train,
          { epochs: totalEpochs, batchSize: 16, validationSplit: 0 },
        );

        // Final weights + metrics back to server
        console.log('[FL] Sending final weights and metrics...');
        await this.sendWeights();
        await this.completeTraining({
          loss: result.loss,
          accuracy: result.accuracy,
        });

        if (this.onRoundComplete) {
          this.onRoundComplete(this.currentRound, {
            loss: result.loss,
            accuracy: result.accuracy,
          });
        }
      } catch (err) {
        console.error('Local training failed:', err);
        if (this.onError) {
          this.onError(err);
        }
      }
    };

    this.wsClient.onTrainingComplete = () => {
      if (this.onRoundComplete) {
        this.onRoundComplete(this.currentRound, {});
      }
    };
  }

  async connect() {
    try {
      // Initialize TensorFlow.js
      await tensorFlowManager.initialize();

      // Connect to server
      const connected = await this.wsClient.connect();
      if (!connected) {
        throw new Error('Failed to connect to server');
      }

      return true;
    } catch (error) {
      console.error('Connection failed:', error);
      if (this.onError) {
        this.onError(error);
      }
      return false;
    }
  }

  async startTraining(round) {
    try {
      // Reset resource monitoring
      resourceMonitor.reset();

      // Check memory status before training
      const memStatus = await resourceMonitor.checkMemoryStatus();
      if (!memStatus.isHealthy) {
        console.warn('Memory warnings:', memStatus.warnings);
        await resourceMonitor.cleanup();
      }

      await this.wsClient.startTraining(round);
    } catch (error) {
      console.error('Failed to start training:', error);
      if (this.onError) {
        this.onError(error);
      }
    }
  }

  async updateTrainingProgress(progress, metrics = {}) {
    try {
      // Update resource monitoring
      resourceMonitor.updateTrainingMetrics({
        progress,
        ...metrics,
      });

      // Check memory status
      const memStatus = await resourceMonitor.checkMemoryStatus();
      if (!memStatus.isHealthy) {
        console.warn('Memory warnings:', memStatus.warnings);
        await resourceMonitor.cleanup();
      }

      // Get current resource metrics
      const resourceMetrics = await resourceMonitor.getResourceMetrics();

      await this.wsClient.updateTrainingProgress(progress);
      if (this.onTrainingProgress) {
        this.onTrainingProgress(progress, resourceMetrics);
      }
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  }

  async sendWeights(weights) {
    try {
      // Serialize weights
      const serializedWeights = await ModelSerializer.serializeWeights(
        this.model,
      );

      // Validate before sending
      if (!ModelSerializer.validateWeights(serializedWeights)) {
        throw new Error('Invalid weight format');
      }

      // Log memory usage
      const memoryStats = ModelSerializer.getModelMemoryUsage(this.model);
      console.log('Model memory usage:', memoryStats);

      await this.wsClient.sendWeights(serializedWeights);
    } catch (error) {
      console.error('Failed to send weights:', error);
      if (this.onError) {
        this.onError(error);
      }
    }
  }

  async updateModelWeights(serializedWeights) {
    try {
      await ModelSerializer.updateModelWeights(this.model, serializedWeights);
      return true;
    } catch (error) {
      console.error('Failed to update model weights:', error);
      if (this.onError) {
        this.onError(error);
      }
      return false;
    }
  }

  async completeTraining(metrics) {
    try {
      await this.wsClient.completeTraining(metrics);
    } catch (error) {
      console.error('Failed to complete training:', error);
      if (this.onError) {
        this.onError(error);
      }
    }
  }

  disconnect() {
    this.wsClient.disconnect();
  }

  getStatus() {
    const defaultStatus = {
      clientId: this.clientId,
      serverAddress: this.wsClient?.serverUrl || null,
      currentRound: this.currentRound,
      isConnected: false,
      model: this.model ? 'Loaded' : 'Not Loaded',
    };

    if (!this.wsClient) {
      return defaultStatus;
    }

    try {
      return {
        ...defaultStatus,
        isConnected: this.wsClient._connected || false,
      };
    } catch (error) {
      console.error('Error getting client status:', error);
      return defaultStatus;
    }
  }
}

export default FlowerClient;
