/**
 * Parameter Serialization Utilities for FedMob
 * Handles conversion between TensorFlow.js tensors and Flower protocol parameters
 */

import * as tf from '@tensorflow/tfjs';

class ParameterSerialization {
  constructor() {
    this.compressionEnabled = true;
    this.compressionThreshold = 1000; // Compress arrays larger than 1000 elements
  }
  /**
   * Get the shape of a nested array
   * @param {Array} arr - The array to get shape for
   * @returns {Array} - The shape array
   */
  getArrayShape(arr) {
    if (!Array.isArray(arr)) {
      return [];
    }

    const shape = [arr.length];
    if (arr.length > 0 && Array.isArray(arr[0])) {
      shape.push(...this.getArrayShape(arr[0]));
    }

    return shape;
  }
  /**
   * Properly flatten weight arrays while preserving tensor structure
   * @param {Array} weightArray - The weight array to flatten
   * @returns {Array} - Flattened array
   */
  flattenWeightArray(weightArray) {
    if (!Array.isArray(weightArray)) {
      return weightArray;
    }

    // For convolutional layers, we need to preserve the structure
    // Use a recursive approach that maintains tensor dimensions
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
   * Convert TensorFlow.js weights to Flower parameters format
   * @param {Array} weights - Array of TensorFlow.js tensors
   * @returns {Array} Serialized parameters for Flower protocol
   */
  serializeWeights(weights) {
    try {
      if (!weights || !Array.isArray(weights)) {
        throw new Error('Invalid weights provided for serialization');
      }

      console.log(`Serializing ${weights.length} weight layers...`);

      const serializedParams = weights.map((weightArray, index) => {
        if (!weightArray || !Array.isArray(weightArray)) {
          throw new Error(`Invalid weight array at index ${index}`);
        }
        const data = this.flattenWeightArray(weightArray); // Proper flattening
        const shape = this.getArrayShape(weightArray);

        // Create parameter object
        const param = {
          data: data,
          shape: shape,
          dtype: 'float32', // Fixed dtype
          layerIndex: index,
          size: data.length,
        };

        return param;
      });

      console.log(
        `Serialization completed: ${serializedParams.length} parameters`,
      );
      return serializedParams;
    } catch (error) {
      console.error('Failed to serialize weights:', error);
      throw error;
    }
  }

  /**
   * Convert Flower parameters back to TensorFlow.js weights
   * @param {Array} parameters - Serialized parameters from Flower protocol
   * @returns {Array} Array of TensorFlow.js tensors
   */
  deserializeParameters(parameters) {
    try {
      if (!parameters || !Array.isArray(parameters)) {
        throw new Error('Invalid parameters provided for deserialization');
      }

      console.log(`Deserializing ${parameters.length} parameter layers...`);

      const weights = parameters.map((param, index) => {
        if (!param || !param.data || !param.shape) {
          throw new Error(`Invalid parameter at index ${index}`);
        }

        let data = param.data;

        // Decompress if compressed
        if (param.compressed) {
          data = this.decompressArray(data);
        }

        // CRITICAL FIX: Return raw arrays, not tensors
        // The ModelManager will handle tensor conversion
        console.log(
          `Layer ${index}: shape=${JSON.stringify(param.shape)}, size=${
            data.length
          }`,
        );

        // Return the raw data array, not a tensor
        return data;
      });

      console.log(`Deserialization completed: ${weights.length} weight arrays`);
      return weights;
    } catch (error) {
      console.error('Failed to deserialize parameters:', error);
      throw error;
    }
  }
  /**
   * Convert model weights to base64 encoded string for network transmission
   * @param {Array} weights - Array of TensorFlow.js tensors
   * @returns {string} Base64 encoded parameters
   */
  weightsToBase64(weights) {
    try {
      const serialized = this.serializeWeights(weights);
      const jsonString = JSON.stringify(serialized);
      const base64 = btoa(jsonString);

      console.log(`Weights encoded to base64: ${base64.length} characters`);
      return base64;
    } catch (error) {
      console.error('Failed to encode weights to base64:', error);
      throw error;
    }
  }

  /**
   * Convert base64 encoded string back to model weights
   * @param {string} base64String - Base64 encoded parameters
   * @returns {Array} Array of TensorFlow.js tensors
   */
  base64ToWeights(base64String) {
    try {
      const jsonString = atob(base64String);
      const serialized = JSON.parse(jsonString);
      const weights = this.deserializeParameters(serialized);

      console.log(`Weights decoded from base64: ${weights.length} tensors`);
      return weights;
    } catch (error) {
      console.error('Failed to decode weights from base64:', error);
      throw error;
    }
  }

  /**
   * Compress array using simple run-length encoding
   * @param {Array} array - Array to compress
   * @returns {Object} Compressed representation
   */
  compressArray(array) {
    try {
      // Simple compression: store unique values and their positions
      const uniqueValues = [...new Set(array)];
      const valueMap = {};
      uniqueValues.forEach((value, index) => {
        valueMap[value] = index;
      });

      const compressed = {
        values: uniqueValues,
        indices: array.map(val => valueMap[val]),
        originalLength: array.length,
      };

      const compressionRatio =
        JSON.stringify(compressed).length / JSON.stringify(array).length;
      console.log(`Array compressed: ${compressionRatio.toFixed(2)}x ratio`);

      return compressed;
    } catch (error) {
      console.error('Failed to compress array:', error);
      return array; // Return original if compression fails
    }
  }

  /**
   * Decompress array from compressed representation
   * @param {Object} compressed - Compressed array representation
   * @returns {Array} Original array
   */
  decompressArray(compressed) {
    try {
      if (!compressed.values || !compressed.indices) {
        return compressed; // Not compressed, return as-is
      }

      const array = compressed.indices.map(index => compressed.values[index]);
      console.log(`Array decompressed: ${array.length} elements`);

      return array;
    } catch (error) {
      console.error('Failed to decompress array:', error);
      return compressed; // Return original if decompression fails
    }
  }

  /**
   * Calculate parameter size in bytes
   * @param {Array} parameters - Parameters to measure
   * @returns {number} Size in bytes
   */
  calculateParameterSize(parameters) {
    try {
      const serialized = this.serializeWeights(parameters);
      const jsonString = JSON.stringify(serialized);
      const sizeInBytes = new Blob([jsonString]).size;

      console.log(
        `Parameter size: ${sizeInBytes} bytes (${(sizeInBytes / 1024).toFixed(
          2,
        )} KB)`,
      );
      return sizeInBytes;
    } catch (error) {
      console.error('Failed to calculate parameter size:', error);
      return 0;
    }
  }

  /**
   * Validate parameter format
   * @param {Array} parameters - Parameters to validate
   * @returns {boolean} True if valid
   */
  validateParameters(parameters) {
    try {
      if (!parameters || !Array.isArray(parameters)) {
        return false;
      }

      for (let i = 0; i < parameters.length; i++) {
        const param = parameters[i];

        if (!param || typeof param !== 'object') {
          console.error(`Invalid parameter at index ${i}: not an object`);
          return false;
        }

        if (!param.data || !Array.isArray(param.data)) {
          console.error(
            `Invalid parameter at index ${i}: missing or invalid data`,
          );
          return false;
        }

        if (!param.shape || !Array.isArray(param.shape)) {
          console.error(
            `Invalid parameter at index ${i}: missing or invalid shape`,
          );
          return false;
        }

        // Check if data length matches shape
        const expectedLength = param.shape.reduce((a, b) => a * b, 1);
        if (param.data.length !== expectedLength) {
          console.error(
            `Parameter ${i}: data length ${
              param.data.length
            } doesn't match shape ${JSON.stringify(param.shape)}`,
          );
          return false;
        }
      }

      console.log(
        `Parameter validation passed: ${parameters.length} valid parameters`,
      );
      return true;
    } catch (error) {
      console.error('Failed to validate parameters:', error);
      return false;
    }
  }

  /**
   * Create parameter summary for logging
   * @param {Array} weights - Raw weight arrays (not serialized parameters)
   * @returns {Object} Parameter summary
   */
  createParameterSummary(weights) {
    try {
      if (!weights || !Array.isArray(weights)) {
        throw new Error('Invalid weights provided for summary');
      }

      const summary = {
        totalLayers: weights.length,
        totalParameters: 0,
        layers: [],
      };

      weights.forEach((weightArray, index) => {
        // Calculate size from the actual weight array
        let layerSize = 0;
        let layerShape = [];

        if (Array.isArray(weightArray)) {
          // Flatten the weight array to count parameters
          const flatArray = this.flattenWeightArray(weightArray);
          layerSize = flatArray.length;
          layerShape = this.getArrayShape(weightArray);
        }

        summary.totalParameters += layerSize;

        summary.layers.push({
          index: index,
          shape: layerShape,
          size: layerSize,
          parameters: layerSize,
        });
      });

      console.log(
        `Parameter summary: ${summary.totalLayers} layers, ${summary.totalParameters} total parameters`,
      );
      return summary;
    } catch (error) {
      console.error('Failed to create parameter summary:', error);
      throw error;
    }
  }

  // ============= IMPLEMENTATION INSTRUCTIONS =============

  /**
   * Enable or disable compression
   * @param {boolean} enabled - Whether to enable compression
   * @param {number} threshold - Compression threshold
   */
  setCompression(enabled, threshold = 1000) {
    this.compressionEnabled = enabled;
    this.compressionThreshold = threshold;
    console.log(
      `Compression ${
        enabled ? 'enabled' : 'disabled'
      } with threshold ${threshold}`,
    );
  }

  /**
   * Get serialization statistics
   * @returns {Object} Serialization statistics
   */
  getStats() {
    return {
      compressionEnabled: this.compressionEnabled,
      compressionThreshold: this.compressionThreshold,
    };
  }
}

// Create singleton instance
const parameterSerialization = new ParameterSerialization();

export default parameterSerialization;
