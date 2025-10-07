/**
 * TensorFlow.js Setup and Utilities for FedMob
 * Handles TensorFlow.js initialization and configuration for React Native
 */

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-cpu';
import { Platform } from 'react-native';
import '@tensorflow/tfjs-react-native';

// No IIFE initialization - we'll do it in the initialize() method

class TensorFlowManager {
  constructor() {
    this.isInitialized = false;
    this.backend = null;
    this.platform = Platform.OS;
  }

  async initialize() {
    try {
      if (this.isInitialized) {
        return true;
      }

      console.log('Initializing TensorFlow.js...');

      // Force CPU backend on React Native to avoid rn-webgl init warnings
      await tf.setBackend('cpu');
      await tf.ready();
      console.log('TensorFlow.js ready');

      // Basic debug (avoid WebGL-specific flags on RN)
      console.log('Debug: TF initialization details:', {
        backend: tf.getBackend(),
        engine: tf.engine() !== undefined,
        optimizers: Object.keys(tf.train),
        memory: tf.memory(),
      });

      // Double check backend is set
      const backend = tf.getBackend();

      this.isInitialized = true;
      this.backend = backend;

      console.log('TensorFlow.js initialized successfully');
      console.log(`Backend: ${backend}`);
      console.log('Memory state:', tf.memory());

      return true;
    } catch (error) {
      console.error('Failed to initialize TensorFlow.js:', error);
      throw error;
    }
  }

  /**
   * Set the appropriate backend for the platform
   */
  async setBackend() {
    try {
      if (this.platform === 'web') {
        // Use WebGL backend for web
        // await tf.setBackend('webgl');
        await tf.setBackend('cpu'); // Instead of 'webgl'
        this.backend = 'cpu';
      } else {
        // Use CPU backend for React Native (WebGL not available)
        await tf.setBackend('cpu');
        this.backend = 'cpu';
      }

      console.log(`Backend set to: ${this.backend}`);
    } catch (error) {
      console.warn('Failed to set preferred backend, using default:', error);
      this.backend = 'cpu';
    }
  }

  /**
   * Configure TensorFlow.js for mobile optimization
   */
  configureForMobile() {
    try {
      // Enable memory management
      tf.enableProdMode();

      // Configure memory management for mobile
      tf.env().set('WEBGL_DELETE_TEXTURE_THRESHOLD', 0);
      tf.env().set('WEBGL_PACK', false);

      // Set memory growth to prevent OOM
      tf.env().set('WEBGL_FORCE_F16_TEXTURES', true);

      // Configure for mobile performance
      tf.env().set('WEBGL_RENDER_FLOAT32_CAPABLE', false);

      console.log('TensorFlow.js configured for mobile optimization');
    } catch (error) {
      console.warn('Failed to configure TensorFlow.js for mobile:', error);
    }
  }

  /**
   * Create a simple CNN model for MNIST
   * @param {Object} config - Model configuration
   * @returns {tf.LayersModel} Compiled model
   */
  createMNISTModel(config = {}) {
    try {
      // Debug: Check initialization state
      console.log('Debug: TF Initialization state:', {
        isInitialized: this.isInitialized,
        backend: tf.getBackend(),
        tfReady: tf.engine() !== undefined,
        memory: tf.memory(),
      });

      if (!this.isInitialized) {
        throw new Error(
          'TensorFlow.js not initialized. Call initialize() first.',
        );
      }

      const {
        inputShape = [28, 28, 1],
        numClasses = 10,
        learningRate = 0.01,
        modelVariant = 'basic', // 'basic' | 'lenet'
      } = config;

      console.log('Debug: Creating model with config:', {
        inputShape,
        numClasses,
        learningRate,
      });

      // Create model with debug checks
      let model;
      try {
        model = tf.sequential();
        console.log('Debug: Sequential model created');
      } catch (e) {
        console.error('Debug: Failed to create sequential model:', e);
        throw e;
      }

      // Add layers with debug checks
      const addLayerWithDebug = (layer, name) => {
        try {
          console.log(`Debug: Adding ${name} layer`);
          model.add(layer);
          console.log(`Debug: ${name} layer added successfully`);
        } catch (e) {
          console.error(`Debug: Failed to add ${name} layer:`, e);
          throw e;
        }
      };

      // Build architecture by variant
      if (modelVariant === 'lenet') {
        // LeNet-5 style for 28x28x1
        addLayerWithDebug(tf.layers.inputLayer({ inputShape }), 'input');
        addLayerWithDebug(
          tf.layers.conv2d({
            filters: 6,
            kernelSize: 5,
            strides: 1,
            padding: 'same',
            activation: 'relu',
            name: 'lenet_conv1',
          }),
          'lenet_conv1',
        );
        addLayerWithDebug(
          tf.layers.maxPooling2d({
            poolSize: 2,
            strides: 2,
            name: 'lenet_pool1',
          }),
          'lenet_pool1',
        );
        addLayerWithDebug(
          tf.layers.conv2d({
            filters: 16,
            kernelSize: 5,
            strides: 1,
            padding: 'same',
            activation: 'relu',
            name: 'lenet_conv2',
          }),
          'lenet_conv2',
        );
        addLayerWithDebug(
          tf.layers.maxPooling2d({
            poolSize: 2,
            strides: 2,
            name: 'lenet_pool2',
          }),
          'lenet_pool2',
        );
        addLayerWithDebug(
          tf.layers.flatten({ name: 'lenet_flatten' }),
          'lenet_flatten',
        );
        addLayerWithDebug(
          tf.layers.dense({
            units: 120,
            activation: 'relu',
            name: 'lenet_fc1',
          }),
          'lenet_fc1',
        );
        addLayerWithDebug(
          tf.layers.dense({ units: 84, activation: 'relu', name: 'lenet_fc2' }),
          'lenet_fc2',
        );
        addLayerWithDebug(
          tf.layers.dense({
            units: numClasses,
            activation: 'softmax',
            name: 'output',
          }),
          'output',
        );
      } else {
        // Basic CNN (default), similar to user-provided basic CNN but adapted to 28x28x1
        addLayerWithDebug(tf.layers.inputLayer({ inputShape }), 'input');
        addLayerWithDebug(
          tf.layers.conv2d({
            filters: 32,
            kernelSize: 3,
            activation: 'relu',
            name: 'conv2d_1',
          }),
          'conv2d_1',
        );
        addLayerWithDebug(
          tf.layers.maxPooling2d({ poolSize: 2, name: 'max_pooling2d_1' }),
          'maxpool_1',
        );
        addLayerWithDebug(
          tf.layers.conv2d({
            filters: 64,
            kernelSize: 3,
            activation: 'relu',
            name: 'conv2d_2',
          }),
          'conv2d_2',
        );
        addLayerWithDebug(
          tf.layers.maxPooling2d({ poolSize: 2, name: 'max_pooling2d_2' }),
          'maxpool_2',
        );
        addLayerWithDebug(tf.layers.flatten({ name: 'flatten' }), 'flatten');
        addLayerWithDebug(
          tf.layers.dense({ units: 128, activation: 'relu', name: 'dense_1' }),
          'dense_1',
        );
        addLayerWithDebug(
          tf.layers.dense({
            units: numClasses,
            activation: 'softmax',
            name: 'dense_2',
          }),
          'dense_2',
        );
      }

      // Debug: Check model state before compile
      console.log('Debug: Model state before compile:', {
        layers: model.layers.length,
        built: model.built,
        weights: model.weights.length,
        optimizer: 'adam',
      });

      // Create optimizer first
      try {
        console.log('Debug: Starting model compilation');

        // Debug: Check TF state before compilation
        console.log('Debug: TF state pre-compilation:', {
          backend: tf.getBackend(),
          engine: tf.engine() !== undefined,
          registeredOptimizers: Object.keys(tf.train),
          modelState: {
            built: model.built,
            weights: model.weights.length,
            layers: model.layers.map(l => ({
              name: l.name,
              built: l.built,
              trainable: l.trainable,
            })),
          },
        });

        // Try creating optimizer explicitly first
        console.log('Debug: Creating optimizer instance');
        // const optimizer = tf.train.adam(0.01);
        // console.log('Debug: Optimizer created:', optimizer);

        // Compile with explicit optimizer instance
        model.compile({
          optimizer: tf.train.adam(learningRate || 0.01),
          loss: 'categoricalCrossentropy',
          metrics: ['accuracy'],
        });
        console.log('Debug: Model compiled successfully');
      } catch (e) {
        console.error('Debug: Compilation failed:', e);
        throw e;
      }

      // Final model check
      console.log('Debug: Final model state:', {
        summary: model.summary(),
        compiled: model.compiled,
        optimizer: model.optimizer?.constructor.name,
      });

      return model;
    } catch (error) {
      console.error('Debug: Complete error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        tfBackend: tf.getBackend(),
        tfVersion: tf.version.tfjs,
      });
      throw error;
    }
  }

  /**
   * Extract model weights as arrays
   * @param {tf.LayersModel} model - TensorFlow.js model
   * @returns {Array} Model weights as array of arrays
   */
  // In tensorflow.js - Line 189-208
  async extractWeights(model) {
    try {
      if (!model) {
        throw new Error('Model is null or undefined');
      }

      const weights = [];
      const weightTensors = model.getWeights();

      for (const tensor of weightTensors) {
        weights.push(await tensor.array()); // ✅ This returns arrays
      }

      console.log(`Extracted ${weights.length} weight layers`);
      return weights;
    } catch (error) {
      console.error('Failed to extract model weights:', error);
      throw error;
    }
  }
  /**
   * Flatten and validate weight data
   * @param {Array} weight - Weight array to flatten
   * @returns {Array} - Flattened array of numbers
   */
  flattenAndValidateWeight(weight) {
    const result = [];

    const flatten = arr => {
      if (Array.isArray(arr)) {
        for (const item of arr) {
          flatten(item);
        }
      } else if (typeof arr === 'number' && !isNaN(arr)) {
        result.push(arr);
      } else {
        throw new Error(`Invalid weight value: ${item}`);
      }
    };

    flatten(weight);
    return result;
  }
  /**
   * Set model weights from arrays
   * @param {tf.LayersModel} model - TensorFlow.js model
   * @param {Array} weights - Model weights as array of arrays
   */
  // In tensorflow.js - Line 215-250
  async setWeights(model, weights) {
    try {
      if (!model) {
        throw new Error('Model is null or undefined');
      }

      if (!weights || weights.length === 0) {
        throw new Error('Invalid weights provided');
      }

      const weightTensors = model.getWeights();

      if (weights.length !== weightTensors.length) {
        throw new Error(
          `Weight count mismatch: expected ${weightTensors.length}, got ${weights.length}`,
        );
      }

      // Create new tensors from weights
      const newWeightTensors = weights.map((weight, index) => {
        const shape = weightTensors[index].shape;

        // Ensure weight is a proper array of numbers
        let weightData = weight;
        if (Array.isArray(weight)) {
          // Flatten nested arrays and ensure all elements are numbers
          weightData = this.flattenAndValidateWeight(weight);
        } else if (weight && typeof weight.dataSync === 'function') {
          // If it's a tensor, get the data
          weightData = weight.dataSync();
        } else {
          throw new Error(
            `Invalid weight data at index ${index}: ${typeof weight}`,
          );
        }

        return tf.tensor(weightData, shape);
      });

      // Set weights
      model.setWeights(newWeightTensors);

      // Dispose of temporary tensors
      newWeightTensors.forEach(tensor => tensor.dispose());

      console.log(`Set ${weights.length} weight layers`);
    } catch (error) {
      console.error('Failed to set model weights:', error);
      throw error;
    }
  }

  /**
   * Dispose of model and free memory
   * @param {tf.LayersModel} model - Model to dispose
   */
  disposeModel(model) {
    try {
      if (model) {
        model.dispose();
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
    try {
      return {
        numTensors: tf.memory().numTensors,
        numBytes: tf.memory().numBytes,
        numDataBuffers: tf.memory().numDataBuffers,
        unreliable: tf.memory().unreliable,
      };
    } catch (error) {
      console.error('Failed to get memory info:', error);
      return null;
    }
  }

  /**
   * Clean up memory
   */
  cleanup() {
    try {
      tf.disposeVariables();
      console.log('Memory cleaned up');
    } catch (error) {
      console.error('Failed to cleanup memory:', error);
    }
  }

  /**
   * Check if TensorFlow.js is ready
   * @returns {boolean} True if ready
   */
  isReady() {
    return this.isInitialized && tf.ready();
  }

  /**
   * Get TensorFlow.js version
   * @returns {string} Version string
   */
  getVersion() {
    return tf.version.tfjs;
  }
}

const tensorFlowManager = new TensorFlowManager();

export default tensorFlowManager;
export { TensorFlowManager };
