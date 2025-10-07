/**
 * Dataset Loader for FedMob
 * Handles MNIST data loading and preprocessing for federated learning
 */

import * as tf from '@tensorflow/tfjs';

class DatasetLoader {
  constructor() {
    this.X_train = null;
    this.y_train = null;
    this.X_test = null;
    this.y_test = null;
    this.isLoaded = false;
    this.clientId = null;
  }

  /**
   * Check if training data is properly formatted
   * @returns {boolean} True if data is valid for training
   */
  isTrainingDataValid() {
    if (!this.isLoaded) {
      console.log('Data not loaded');
      return false;
    }

    try {
      // Check X_train
      if (!this.X_train || this.X_train.shape[0] === 0) {
        console.log('X_train is invalid');
        return false;
      }

      // Check y_train
      if (!this.y_train || this.y_train.shape[0] === 0) {
        console.log('y_train is invalid');
        return false;
      }

      // Check shapes match
      if (this.X_train.shape[0] !== this.y_train.shape[0]) {
        console.log('Sample count mismatch between X_train and y_train');
        return false;
      }

      // Check proper dimensions
      if (this.X_train.shape.length !== 4) {
        console.log(
          'X_train should have 4 dimensions [batch, height, width, channels]',
        );
        return false;
      }

      if (this.y_train.shape.length !== 2) {
        console.log('y_train should have 2 dimensions [batch, classes]');
        return false;
      }

      // Check expected shapes for MNIST
      const [batch, height, width, channels] = this.X_train.shape;
      const [batchY, classes] = this.y_train.shape;

      if (height !== 28 || width !== 28 || channels !== 1) {
        console.log(
          `Expected MNIST shape [28,28,1], got [${height},${width},${channels}]`,
        );
        return false;
      }

      if (classes !== 10) {
        console.log(`Expected 10 classes, got ${classes}`);
        return false;
      }

      console.log('Training data validation passed');
      return true;
    } catch (error) {
      console.error('Error validating training data:', error);
      return false;
    }
  }
  /**
   * Load local MNIST data
   * @param {string} clientId - Client identifier for data partitioning
   */
  async loadLocalData(clientId = 'client_0') {
    try {
      console.log(`Loading local data for client: ${clientId}`);

      this.clientId = clientId;

      // Generate synthetic MNIST-like data for testing
      // In a real implementation, this would load actual MNIST data
      await this.generateSyntheticData();

      this.isLoaded = true;
      console.log('Local data loaded successfully');
      console.log(
        `Training samples: ${
          this.X_train.shape ? this.X_train.shape[0] : 'n/a'
        }`,
      );
      console.log(
        `Test samples: ${this.X_test.shape ? this.X_test.shape[0] : 'n/a'}`,
      );
    } catch (error) {
      console.error('Failed to load local data:', error);
      throw error;
    }
  }

  /**
   * Generate synthetic MNIST-like data for testing
   */
  async generateSyntheticData() {
    try {
      console.log('Generating synthetic MNIST data...');

      // Generate random data that mimics MNIST structure
      const numTrainSamples = 32; // Further reduced for debug speed on-device
      const numTestSamples = 64;
      const imageSize = 28 * 28; // 28x28 pixels
      const numClasses = 10;

      // Generate training data
      const X_train_flat = tf.randomUniform([numTrainSamples, imageSize], 0, 1);
      const y_train_flat = tf.randomUniform(
        [numTrainSamples],
        0,
        numClasses,
        'int32',
      );

      // Generate test data
      const X_test_flat = tf.randomUniform([numTestSamples, imageSize], 0, 1);
      const y_test_flat = tf.randomUniform(
        [numTestSamples],
        0,
        numClasses,
        'int32',
      );

      // Reshape to (samples, height, width, channels)
      this.X_train = X_train_flat.reshape([numTrainSamples, 28, 28, 1]);
      this.y_train = this.oneHotEncode(y_train_flat, numClasses);

      this.X_test = X_test_flat.reshape([numTestSamples, 28, 28, 1]);
      this.y_test = this.oneHotEncode(y_test_flat, numClasses);

      // Dispose of intermediate tensors
      X_train_flat.dispose();
      y_train_flat.dispose();
      X_test_flat.dispose();
      y_test_flat.dispose();

      console.log('Synthetic data generated successfully');
    } catch (error) {
      console.error('Failed to generate synthetic data:', error);
      throw error;
    }
  }

  /**
   * One-hot encode labels
   * @param {tf.Tensor} labels - Integer labels
   * @param {number} numClasses - Number of classes
   * @returns {tf.Tensor} One-hot encoded labels
   */
  oneHotEncode(labels, numClasses) {
    return tf.oneHot(labels, numClasses);
  }

  /**
   * Get training data
   * @returns {Object} Training data
   */
  getTrainingData() {
    if (!this.isLoaded) {
      throw new Error('Data not loaded. Call loadLocalData() first.');
    }

    return {
      X_train: this.X_train,
      y_train: this.y_train,
    };
  }

  /**
   * Get test data
   * @returns {Object} Test data
   */
  getTestData() {
    if (!this.isLoaded) {
      throw new Error('Data not loaded. Call loadLocalData() first.');
    }

    return {
      X_test: this.X_test,
      y_test: this.y_test,
    };
  }

  /**
   * Get all data
   * @returns {Object} All data
   */
  getAllData() {
    if (!this.isLoaded) {
      throw new Error('Data not loaded. Call loadLocalData() first.');
    }

    return {
      X_train: this.X_train,
      y_train: this.y_train,
      X_test: this.X_test,
      y_test: this.y_test,
    };
  }

  /**
   * Check if data is loaded
   * @returns {boolean} True if data is loaded
   */
  hasData() {
    return this.isLoaded && this.X_train !== null;
  }

  /**
   * Get data statistics
   * @returns {Object} Data statistics
   */
  getDataStats() {
    if (!this.isLoaded) {
      return null;
    }

    return {
      clientId: this.clientId,
      trainSamples: this.X_train.shape[0],
      testSamples: this.X_test.shape[0],
      imageShape: this.X_train.shape.slice(1),
      numClasses: this.y_train.shape[1],
      dataType: this.X_train.dtype,
    };
  }

  /**
   * Create data batches
   * @param {tf.Tensor} X - Input data
   * @param {tf.Tensor} y - Labels
   * @param {number} batchSize - Batch size
   * @returns {Array} Array of batches
   */
  createBatches(X, y, batchSize = 32) {
    try {
      const numSamples = X.shape[0];
      const numBatches = Math.ceil(numSamples / batchSize);
      const batches = [];

      for (let i = 0; i < numBatches; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, numSamples);

        const X_batch = X.slice([start, 0, 0, 0], [end - start, -1, -1, -1]);
        const y_batch = y.slice([start, 0], [end - start, -1]);

        batches.push({
          X: X_batch,
          y: y_batch,
          size: end - start,
        });
      }

      return batches;
    } catch (error) {
      console.error('Failed to create batches:', error);
      throw error;
    }
  }

  /**
   * Shuffle data
   * @param {tf.Tensor} X - Input data
   * @param {tf.Tensor} y - Labels
   * @returns {Object} Shuffled data
   */
  shuffleData(X, y) {
    try {
      const numSamples = X.shape[0];
      const indices = tf.randomUniform([numSamples], 0, numSamples, 'int32');

      const X_shuffled = tf.gather(X, indices);
      const y_shuffled = tf.gather(y, indices);

      // Dispose of indices tensor
      indices.dispose();

      return {
        X: X_shuffled,
        y: y_shuffled,
      };
    } catch (error) {
      console.error('Failed to shuffle data:', error);
      throw error;
    }
  }

  /**
   * Normalize data to [0, 1] range
   * @param {tf.Tensor} X - Input data
   * @returns {tf.Tensor} Normalized data
   */
  normalizeData(X) {
    try {
      // Assuming data is already in [0, 1] range
      // In a real implementation, you might want to normalize from [0, 255] to [0, 1]
      return X;
    } catch (error) {
      console.error('Failed to normalize data:', error);
      throw error;
    }
  }

  /**
   * Augment data (basic augmentation for mobile)
   * @param {tf.Tensor} X - Input data
   * @param {tf.Tensor} y - Labels
   * @param {number} factor - Augmentation factor
   * @returns {Object} Augmented data
   */
  augmentData(X, y, factor = 1.5) {
    try {
      const numSamples = X.shape[0];
      const augmentedSamples = Math.floor(numSamples * factor);

      if (augmentedSamples <= numSamples) {
        return { X, y };
      }

      // Simple augmentation: add noise
      const noise = tf.randomNormal(
        [augmentedSamples - numSamples, ...X.shape.slice(1)],
        0,
        0.1,
      );
      const X_augmented = tf.concat(
        [
          X,
          X.slice(
            [0, 0, 0, 0],
            [augmentedSamples - numSamples, -1, -1, -1],
          ).add(noise),
        ],
        0,
      );
      const y_augmented = tf.concat(
        [y, y.slice([0, 0], [augmentedSamples - numSamples, -1])],
        0,
      );

      // Dispose of noise tensor
      noise.dispose();

      return {
        X: X_augmented,
        y: y_augmented,
      };
    } catch (error) {
      console.error('Failed to augment data:', error);
      throw error;
    }
  }

  /**
   * Dispose of all data tensors
   */
  dispose() {
    try {
      if (this.X_train) {
        this.X_train.dispose();
        this.X_train = null;
      }
      if (this.y_train) {
        this.y_train.dispose();
        this.y_train = null;
      }
      if (this.X_test) {
        this.X_test.dispose();
        this.X_test = null;
      }
      if (this.y_test) {
        this.y_test.dispose();
        this.y_test = null;
      }

      this.isLoaded = false;
      console.log('Dataset disposed successfully');
    } catch (error) {
      console.error('Failed to dispose dataset:', error);
    }
  }

  /**
   * Reset dataset
   */
  async reset() {
    try {
      this.dispose();
      await this.loadLocalData(this.clientId);
      console.log('Dataset reset successfully');
    } catch (error) {
      console.error('Failed to reset dataset:', error);
      throw error;
    }
  }
}

export default DatasetLoader;
