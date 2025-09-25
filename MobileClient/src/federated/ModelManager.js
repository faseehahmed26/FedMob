/**
 * Model Manager for FedMob
 * Handles TensorFlow.js model creation, weight management, and serialization
 */

import tensorFlowManager from '../utils/tensorflow.js';
import * as tf from '@tensorflow/tfjs';

class ModelManager {
  constructor() {
    this.model = null;
    this.isInitialized = false;
    this.modelConfig = {
      inputShape: [28, 28, 1],
      numClasses: 10,
      learningRate: 0.01,
    };
  }

  /**
   * Initialize TensorFlow.js and create model
   */
  async initializeTensorFlow() {
    try {
      console.log('Initializing TensorFlow.js...');
      await tensorFlowManager.initialize();
      this.isInitialized = true;
      console.log('TensorFlow.js initialized successfully');
    } catch (error) {
      console.error('Failed to initialize TensorFlow.js:', error);
      throw error;
    }
  }

  /**
   * Initialize the MNIST model
   */
  async initializeModel() {
    try {
      if (!this.isInitialized) {
        await this.initializeTensorFlow();
      }

      console.log('Creating MNIST model...');
      this.model = tensorFlowManager.createMNISTModel(this.modelConfig);

      console.log('Model created successfully');
      console.log('Model summary:', this.model.summary());

      return this.model;
    } catch (error) {
      console.error('Failed to initialize model:', error);
      throw error;
    }
  }

  /**
   * Get the current model
   * @returns {tf.LayersModel} TensorFlow.js model
   */
  getModel() {
    if (!this.model) {
      throw new Error('Model not initialized. Call initializeModel() first.');
    }
    return this.model;
  }

  /**
   * Check if model is initialized
   * @returns {boolean} True if model exists
   */
  hasModel() {
    return this.model !== null;
  }

  /**
   * Get model weights as arrays - FIXED VERSION
   * @returns {Array} Model weights as array of arrays
   */
  async getModelWeights() {
    try {
      if (!this.model) {
        throw new Error('Model not initialized');
      }

      // Get TensorFlow weights - DON'T dispose them!
      const tfWeights = this.model.getWeights();

      // Convert to JavaScript arrays without disposing original tensors
      const weights = await Promise.all(
        tfWeights.map(async weight => {
          const array = await weight.array();
          // DO NOT dispose the weight here! The model still needs it
          return array;
        }),
      );

      console.log(`Retrieved ${weights.length} weight layers`);
      return weights;
    } catch (error) {
      console.error('Failed to get model weights:', error);
      throw error;
    }
  }

  /**
   * Set model weights from arrays - FIXED VERSION
   * @param {Array} weights - Model weights as array of arrays
   */
  async setModelWeights(weights) {
    try {
      if (!this.model) {
        throw new Error('Model not initialized');
      }

      if (!weights || weights.length === 0) {
        throw new Error('Invalid weights provided');
      }

      // Get the expected shapes from the model
      const modelWeights = this.model.getWeights();

      if (weights.length !== modelWeights.length) {
        throw new Error(
          `Weight count mismatch: expected ${modelWeights.length}, got ${weights.length}`,
        );
      }

      // Convert arrays back to tensors with proper shapes
      const tensorWeights = weights.map((weightData, index) => {
        const expectedShape = modelWeights[index].shape;

        let flatArray;

        // Handle different input formats
        if (Array.isArray(weightData)) {
          // Case 1: Nested arrays from getModelWeights()
          if (Array.isArray(weightData[0])) {
            flatArray = weightData.flat(Infinity);
          } else {
            // Case 2: Already flat array from deserialization
            flatArray = weightData;
          }
        } else if (weightData && typeof weightData.dataSync === 'function') {
          // Case 3: TensorFlow tensor
          flatArray = weightData.dataSync();
        } else {
          throw new Error(
            `Invalid weight data at index ${index}: ${typeof weightData}`,
          );
        }

        // Validate array contains only numbers
        if (!flatArray.every(val => typeof val === 'number' && !isNaN(val))) {
          throw new Error(`Weight ${index} contains non-numeric values`);
        }

        // Create tensor with the correct shape
        return tf.tensor(flatArray, expectedShape);
      });

      // Set weights
      this.model.setWeights(tensorWeights);

      // Clean up the temporary tensors we created
      tensorWeights.forEach(tensor => tensor.dispose());

      console.log(`Set ${weights.length} weight layers`);
    } catch (error) {
      console.error('Failed to set model weights:', error);
      throw error;
    }
  }

  /**
   * Create a copy of the current model - FIXED VERSION
   * @returns {tf.LayersModel} Copy of the model
   */
  async cloneModel() {
    try {
      if (!this.model) {
        throw new Error('Model not initialized');
      }

      // Create new model with same architecture
      const clonedModel = tensorFlowManager.createMNISTModel(this.modelConfig);

      // Get current weights as arrays (not disposing original tensors)
      const weights = await this.getModelWeights();

      // Convert arrays to tensors for the cloned model
      const tensorWeights = weights.map(weightArray => {
        return tf.tensor(weightArray);
      });

      // Set weights on cloned model
      clonedModel.setWeights(tensorWeights);

      // Clean up the temporary tensors we created
      tensorWeights.forEach(tensor => tensor.dispose());

      console.log('Model cloned successfully');
      return clonedModel;
    } catch (error) {
      console.error('Failed to clone model:', error);
      throw error;
    }
  }

  /**
   * Save model to local storage
   * @param {string} key - Storage key
   */
  async saveModel(key = 'fedmob_model') {
    try {
      if (!this.model) {
        throw new Error('Model not initialized');
      }

      // Get model weights
      const weights = await this.getModelWeights();

      // Create model data object
      const modelData = {
        weights: weights,
        config: this.modelConfig,
        timestamp: Date.now(),
      };

      // Save to AsyncStorage (you'll need to implement this)
      // For now, just log
      console.log(`Model saved with key: ${key}`);
      console.log(`Model data size: ${JSON.stringify(modelData).length} bytes`);

      return modelData;
    } catch (error) {
      console.error('Failed to save model:', error);
      throw error;
    }
  }

  /**
   * Load model from local storage
   * @param {string} key - Storage key
   */
  async loadModel(key = 'fedmob_model') {
    try {
      // Load from AsyncStorage (you'll need to implement this)
      // For now, just log
      console.log(`Loading model with key: ${key}`);

      // If no saved model, initialize new one
      if (!this.model) {
        await this.initializeModel();
      }

      console.log('Model loaded successfully');
      return this.model;
    } catch (error) {
      console.error('Failed to load model:', error);
      throw error;
    }
  }

  /**
   * Get model architecture information
   * @returns {Object} Model architecture info
   */
  getModelInfo() {
    try {
      if (!this.model) {
        return null;
      }

      const layers = this.model.layers;
      const layerInfo = layers.map((layer, index) => ({
        index: index,
        name: layer.name,
        type: layer.constructor.name,
        inputShape: layer.inputShape,
        outputShape: layer.outputShape,
        trainableParams: layer.countParams(),
      }));

      return {
        totalLayers: layers.length,
        totalParams: this.model.countParams(),
        layers: layerInfo,
        config: this.modelConfig,
      };
    } catch (error) {
      console.error('Failed to get model info:', error);
      return null;
    }
  }

  /**
   * Validate model weights - FIXED VERSION
   * @param {Array} weights - Weights to validate
   * @returns {Promise<boolean>} True if valid
   */
  // ============= FIX 1: Weight Validation Issue =============
  // In ModelManager.js - Replace your validateWeights method with this corrected version:

  async validateWeights(weights) {
    try {
      if (!weights || !Array.isArray(weights)) {
        console.log('Weights validation failed: not an array');
        return false;
      }

      // Get current model structure for comparison
      const modelWeights = this.model.getWeights();

      if (weights.length !== modelWeights.length) {
        console.log(
          `Weight count mismatch: expected ${modelWeights.length}, got ${weights.length}`,
        );
        return false;
      }

      // Validate each weight layer
      for (let i = 0; i < weights.length; i++) {
        const expectedShape = modelWeights[i].shape;
        const actualWeight = weights[i];

        // Check if weight is an array
        if (!Array.isArray(actualWeight)) {
          console.log(`Weight ${i} is not an array`);
          return false;
        }

        // Calculate expected size from shape
        const expectedSize = expectedShape.reduce((a, b) => a * b, 1);

        // CRITICAL FIX: Properly flatten multi-dimensional arrays
        const flatWeight = this.flattenWeightArray(actualWeight);
        const actualSize = flatWeight.length;

        if (expectedSize !== actualSize) {
          console.log(
            `Weight ${i}: expected size ${expectedSize}, got ${actualSize}`,
          );
          console.log(
            `Expected shape: [${expectedShape}], Actual data length: ${actualSize}`,
          );
          return false;
        }

        // Check for reasonable numeric values
        if (actualSize === 0) {
          console.log(`Weight ${i} is empty`);
          return false;
        }

        // Validate that all values are numbers
        const hasNonNumbers = flatWeight.some(
          val => typeof val !== 'number' || isNaN(val),
        );
        if (hasNonNumbers) {
          console.log(`Weight ${i} contains non-numeric values`);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to validate weights:', error);
      return false;
    }
  }

  // Add this helper method to ModelManager.js:
  flattenWeightArray(weightArray) {
    const result = [];

    const flattenRecursive = arr => {
      if (Array.isArray(arr)) {
        for (const item of arr) {
          flattenRecursive(item);
        }
      } else {
        result.push(arr);
      }
    };

    flattenRecursive(weightArray);
    return result;
  }
  /**
   * Dispose of the model and free memory - SAFE VERSION
   */
  dispose() {
    try {
      if (this.model) {
        // Only dispose the model itself, not individual weights
        this.model.dispose();
        this.model = null;
        console.log('Model disposed successfully');
      }
    } catch (error) {
      console.error('Failed to dispose model:', error);
    }
  }
  /**
   * Get memory usage information
   * @returns {Object} Memory usage stats
   */
  getMemoryInfo() {
    return tensorFlowManager.getMemoryInfo();
  }

  /**
   * Clean up memory
   */
  cleanup() {
    tensorFlowManager.cleanup();
  }

  /**
   * Reset model to initial state
   */
  async reset() {
    try {
      this.dispose();
      await this.initializeModel();
      console.log('Model reset successfully');
    } catch (error) {
      console.error('Failed to reset model:', error);
      throw error;
    }
  }
}

export default ModelManager;
