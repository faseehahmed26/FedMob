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

    // Weight update handler - apply server weights before training
    this.wsClient.onWeightsUpdate = async serializedWeights => {
      try {
        console.log(
          `[FL] Received weights from server: ${serializedWeights.length} layers`,
        );

        // Validate weights before processing
        if (!serializedWeights || serializedWeights.length === 0) {
          console.warn('[FL] Received empty weights array, skipping update');
          return;
        }

        // Ensure model exists before applying weights
        if (!this.model) {
          console.log('[FL] Creating MNIST model before applying weights...');
          await tensorFlowManager.initialize();
          this.model = tensorFlowManager.createMNISTModel({
            modelVariant: 'lenet',
          });
        }

        // Log model state before weight update
        const modelWeightsBefore = this.model.getWeights();
        console.log(`[FL] Model has ${modelWeightsBefore.length} weight layers before update`);

        // Apply weights to model
        await ModelSerializer.updateModelWeights(this.model, serializedWeights);
        
        // Verify weights were applied
        const modelWeightsAfter = this.model.getWeights();
        console.log(`[FL] Model has ${modelWeightsAfter.length} weight layers after update`);
        console.log('[FL] Successfully applied server weights to model');
      } catch (error) {
        console.error('[FL] Error applying server weights:', error);
        console.error('[FL] Error stack:', error.stack);
        if (this.onError) {
          this.onError(error);
        }
        // Re-throw to prevent training from starting with invalid weights
        throw error;
      }
    };

    // Evaluation events
    this.wsClient.onEvaluateRequest = async (parameters, config) => {
      try {
        console.log('[FL] ===================== EVALUATION START ====================');
        console.log(`[FL] Received evaluation request from server`);
        console.log(`[FL] Parameters: ${parameters ? parameters.length : 0} layers`);
        console.log(`[FL] Config: ${JSON.stringify(config)}`);
        console.log('[FL] ==========================================================');

        // Ensure model and data are ready
        await this.ensureModelAndDataReady();

        // Perform evaluation using the evaluate method we implemented
        const evalResult = await this.evaluate(parameters, config);
        
        console.log('[FL] ===================== EVALUATION COMPLETE ================');
        console.log(`[FL] Evaluation results:`);
        console.log(`[FL]   - Loss: ${evalResult.loss.toFixed(4)}`);
        console.log(`[FL]   - Accuracy: ${evalResult.accuracy.toFixed(4)}`);
        console.log(`[FL]   - Num examples: ${evalResult.num_examples}`);
        console.log('[FL] ============================================================');

        // Send evaluation results back to server
        await this.wsClient.completeEvaluation({
          loss: evalResult.loss,
          accuracy: evalResult.accuracy,
          num_examples: evalResult.num_examples,
          metrics: evalResult.metrics
        });

        console.log('[FL] Evaluation results sent to server');
        
      } catch (error) {
        console.error('[FL] Evaluation failed:', error);
        
        // Send fallback results
        await this.wsClient.completeEvaluation({
          loss: 0.0,
          accuracy: 0.0,
          num_examples: 100,
          metrics: { accuracy: 0.0 }
        });
        
        if (this.onError) {
          this.onError(error);
        }
      }
    };

    // Training events
    this.wsClient.onTrainingStart = async (round, config) => {
      this.currentRound = round;
      if (this.onRoundStart) {
        this.onRoundStart(round);
      }

      try {
        console.log(
          `[FL] onTrainingStart round=${round} - preparing model/data...`,
        );
        console.log(`[FL] Config from server:`, config);
        
        // Extract training parameters from server config
        const modelVariant = config?.model_variant || config?.modelVariant || 'lenet';
        const epochs = parseInt(config?.epochs || '1', 10);
        const batchSize = parseInt(config?.batch_size || config?.batchSize || '32', 10);
        const learningRate = parseFloat(config?.learning_rate || config?.learningRate || '0.01');
        
        console.log(`[FL] Training parameters from server:`);
        console.log(`[FL]   - Model: ${modelVariant}`);
        console.log(`[FL]   - Epochs: ${epochs}`);
        console.log(`[FL]   - Batch size: ${batchSize}`);
        console.log(`[FL]   - Learning rate: ${learningRate}`);
        
        // Ensure TF ready and model/data prepared
        await tensorFlowManager.initialize();
        if (!this.model) {
          console.log(`[FL] Creating MNIST model with variant: ${modelVariant}`);
          this.model = tensorFlowManager.createMNISTModel({
            modelVariant: modelVariant,
            learningRate: learningRate,
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

        // Use training parameters from server config
        const totalEpochs = epochs;
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

        // Enhanced memory monitoring before training
        let memBefore, memAfter;
        if (typeof tf !== 'undefined' && tf.memory) {
          memBefore = tf.memory();
          console.log(`[FL] Memory before training - tensors: ${memBefore.numTensors}, bytes: ${memBefore.numBytes}`);
        }

        // Validate dataset tensors before training with enhanced recovery
        if (!this.datasetLoader.X_train || !this.datasetLoader.y_train) {
          console.error('[FL] Training data not loaded - X_train or y_train is missing');
          throw new Error('[FL] Training data not loaded - X_train or y_train is missing');
        }

        // Check if tensors are disposed and reload if needed with timeout
        if (this.datasetLoader.X_train.isDisposed || this.datasetLoader.y_train.isDisposed) {
          console.warn('[FL] Training tensors were disposed, attempting reload...');
          try {
            await Promise.race([
              this.datasetLoader.loadLocalData(this.clientId),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Dataset reload timeout')), 30000))
            ]);
            // Validate again after reload
            if (!this.datasetLoader.X_train || !this.datasetLoader.y_train) {
              throw new Error('[FL] Failed to reload training data');
            }
            console.log('[FL] Dataset tensors successfully reloaded');
          } catch (reloadError) {
            console.error('[FL] Failed to reload dataset tensors:', reloadError);
            throw new Error(`Dataset reload failed: ${reloadError.message}`);
          }
        }

        // Train local model for one round
        console.log(`[FL] Starting local training for ${totalEpochs} epoch(s) with batch size ${batchSize}...`);
        const result = await this.trainingEngine.trainModel(
          this.model,
          this.datasetLoader.X_train,
          this.datasetLoader.y_train,
          { epochs: totalEpochs, batchSize: batchSize, validationSplit: 0 },
        );
        
        // Memory monitoring after training
        if (typeof tf !== 'undefined' && tf.memory) {
          memAfter = tf.memory();
          console.log(`[FL] Memory after training - tensors: ${memAfter.numTensors}, bytes: ${memAfter.numBytes}`);
          const tensorDiff = memAfter.numTensors - (memBefore?.numTensors || 0);
          const byteDiff = memAfter.numBytes - (memBefore?.numBytes || 0);
          console.log(`[FL] Memory change - tensors: +${tensorDiff}, bytes: +${byteDiff}`);
        }

        // Final weights + metrics back to server
        console.log(
          '[FL] Preparing final weights and metrics for server...',
        );

        // Serialize final weights
        const serializedWeights = await ModelSerializer.serializeWeights(
          this.model,
        );

        // Get number of training samples
        const numSamples = this.datasetLoader.X_train
          ? this.datasetLoader.X_train.shape[0]
          : 0;

        console.log(`[FL] Sending training completion to server:`);
        console.log(`[FL]    - Round: ${this.currentRound}`);
        console.log(`[FL]    - Samples: ${numSamples}`);
        console.log(`[FL]    - Weight layers: ${serializedWeights.length}`);
        console.log(
          `[FL]    - Metrics: loss=${result.loss.toFixed(
            4,
          )}, accuracy=${result.accuracy.toFixed(4)}`,
        );

        // Send weights and completion together with retry logic
        let retries = 3;
        while (retries > 0) {
          try {
            await this.completeTraining({
              weights: serializedWeights,
              num_samples: numSamples,
              metrics: {
                loss: result.loss,
                accuracy: result.accuracy,
              },
            });
            break; // Success, exit retry loop
          } catch (sendError) {
            retries--;
            console.error(`[FL] Training completion send failed (${3 - retries}/3):`, sendError);
            if (retries === 0) {
              throw sendError; // Re-throw after all retries
            }
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        console.log('[FL] Training completion sent to server');

        if (this.onRoundComplete) {
          this.onRoundComplete(this.currentRound, {
            loss: result.loss,
            accuracy: result.accuracy,
          });
        }
      } catch (err) {
        console.error('[FL] Training session failed:', err);
        
        // Enhanced error recovery - force memory cleanup
        try {
          console.log('[FL] Attempting error recovery and memory cleanup...');
          
          // Force garbage collection if available
          if (typeof tf !== 'undefined' && tf.dispose) {
            tf.dispose();
            console.log('[FL] TensorFlow.js dispose() called');
          }
          
          // Memory status after cleanup
          if (typeof tf !== 'undefined' && tf.memory) {
            const memAfterCleanup = tf.memory();
            console.log(`[FL] Memory after cleanup - tensors: ${memAfterCleanup.numTensors}, bytes: ${memAfterCleanup.numBytes}`);
          }
          
          console.log('[FL] Error recovery completed');
        } catch (recoveryError) {
          console.error('[FL] Error recovery failed:', recoveryError);
        }
        
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

  async completeTraining(data) {
    try {
      // data should contain: { weights, num_samples, metrics }
      await this.wsClient.completeTraining(data);
    } catch (error) {
      console.error('Failed to complete training:', error);
      if (this.onError) {
        this.onError(error);
      }
    }
  }

  /**
   * Evaluate model on local test data for distributed evaluation
   * @param {Array} parameters - Model parameters from server (optional, uses current model if not provided)
   * @param {Object} config - Evaluation configuration
   * @returns {Object} Evaluation results with loss, accuracy, and num_examples
   */
  async evaluate(parameters = null, config = {}) {
    try {
      console.log('[FL] Starting distributed evaluation...');
      console.log('[FL] Evaluation config:', config);

      // Ensure model and data are available
      await this.ensureModelAndDataReady();

      // Apply parameters if provided (for centralized evaluation scenarios)
      if (parameters && parameters.length > 0) {
        console.log(`[FL] Applying ${parameters.length} parameter layers for evaluation`);
        await ModelSerializer.updateModelWeights(this.model, parameters);
      }

      // Ensure we have test data
      if (!this.datasetLoader.X_test || !this.datasetLoader.y_test) {
        console.warn('[FL] No test data available, using training data subset for evaluation');
        // Fallback: use a small subset of training data for evaluation
        if (this.datasetLoader.X_train && this.datasetLoader.y_train) {
          const trainSize = this.datasetLoader.X_train.shape[0];
          const evalSize = Math.min(20, Math.floor(trainSize * 0.2));
          
          // Take last 20% of training data for evaluation
          const startIdx = trainSize - evalSize;
          this.datasetLoader.X_test = this.datasetLoader.X_train.slice([startIdx, 0, 0, 0], [evalSize, -1, -1, -1]);
          this.datasetLoader.y_test = this.datasetLoader.y_train.slice([startIdx, 0], [evalSize, -1]);
          
          console.log(`[FL] Created test subset: ${evalSize} samples from training data`);
        } else {
          throw new Error('No training or test data available for evaluation');
        }
      }

      // Check if test tensors are disposed and reload if needed
      if (this.datasetLoader.X_test.isDisposed || this.datasetLoader.y_test.isDisposed) {
        console.warn('[FL] Test tensors were disposed, attempting reload...');
        await this.datasetLoader.loadLocalData(this.clientId);
        
        if (!this.datasetLoader.X_test) {
          // Recreate test subset if needed
          const trainSize = this.datasetLoader.X_train.shape[0];
          const evalSize = Math.min(20, Math.floor(trainSize * 0.2));
          const startIdx = trainSize - evalSize;
          this.datasetLoader.X_test = this.datasetLoader.X_train.slice([startIdx, 0, 0, 0], [evalSize, -1, -1, -1]);
          this.datasetLoader.y_test = this.datasetLoader.y_train.slice([startIdx, 0], [evalSize, -1]);
        }
      }

      // Perform evaluation using TrainingEngine
      console.log('[FL] Evaluating model on local test data...');
      const evalResults = await this.trainingEngine.evaluateModel(
        this.model,
        this.datasetLoader.X_test,
        this.datasetLoader.y_test,
        32 // batch size
      );

      const numExamples = this.datasetLoader.X_test.shape[0];
      
      console.log('[FL] Distributed evaluation completed:');
      console.log(`[FL]   - Test samples: ${numExamples}`);
      console.log(`[FL]   - Test loss: ${evalResults.loss.toFixed(4)}`);
      console.log(`[FL]   - Test accuracy: ${evalResults.accuracy.toFixed(4)}`);

      return {
        loss: evalResults.loss,
        accuracy: evalResults.accuracy,
        num_examples: numExamples,
        metrics: {
          accuracy: evalResults.accuracy
        }
      };

    } catch (error) {
      console.error('[FL] Distributed evaluation failed:', error);
      
      // Return dummy values as fallback
      console.warn('[FL] Returning dummy evaluation values due to error');
      return {
        loss: 0.0,
        accuracy: 0.0,
        num_examples: 100, // Use a reasonable default
        metrics: {
          accuracy: 0.0
        }
      };
    }
  }

  /**
   * Ensure model and data are ready for training/evaluation
   */
  async ensureModelAndDataReady() {
    // Initialize TensorFlow if needed
    await tensorFlowManager.initialize();
    
    // Create model if needed
    if (!this.model) {
      console.log('[FL] Creating MNIST model for evaluation...');
      this.model = tensorFlowManager.createMNISTModel({
        modelVariant: 'lenet',
        learningRate: 0.01,
      });
    }
    
    // Load dataset if needed
    if (!this.datasetLoader) {
      this.datasetLoader = new DatasetLoader();
      console.log('[FL] Loading local dataset for evaluation...');
      await this.datasetLoader.loadLocalData(this.clientId);
    }
    
    // Create training engine if needed
    if (!this.trainingEngine) {
      console.log('[FL] Creating TrainingEngine for evaluation...');
      this.trainingEngine = new TrainingEngine();
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
