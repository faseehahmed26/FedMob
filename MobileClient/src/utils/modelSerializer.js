/**
 * Model Serialization Utilities for FedMob
 * Handles model weight serialization and compression
 */

import * as tf from '@tensorflow/tfjs';

class ModelSerializer {
  /**
   * Serialize model weights for transfer
   * @param {tf.LayersModel} model - TensorFlow.js model
   * @returns {Array} Serialized weights
   */
  static async serializeWeights(model) {
    const weights = model.getWeights();
    return weights.map(w => ({
      shape: Array.from(w.shape),
      dtype: w.dtype,
      data: this.tensorToBase64(w),
    }));
  }

  /**
   * Convert tensor to base64 string
   * @param {tf.Tensor} tensor - TensorFlow.js tensor
   * @returns {string} Base64 encoded data
   */
  static tensorToBase64(tensor) {
    const data = tensor.dataSync();
    const buffer = new Uint8Array(data.buffer);
    let binary = '';
    for (let i = 0; i < buffer.byteLength; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);
  }

  /**
   * Update model weights from serialized format
   * @param {tf.LayersModel} model - TensorFlow.js model
   * @param {Array} serializedWeights - Serialized weights
   */
  static async updateModelWeights(model, serializedWeights) {
    const weights = serializedWeights.map(w =>
      tf.tensor(this.base64ToFloat32Array(w.data), w.shape, w.dtype),
    );

    model.setWeights(weights);
  }

  /**
   * Convert base64 string to Float32Array
   * @param {string} base64 - Base64 encoded data
   * @returns {Float32Array} Decoded data
   */
  static base64ToFloat32Array(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Float32Array(bytes.buffer);
  }

  /**
   * Get model memory usage
   * @param {tf.LayersModel} model - TensorFlow.js model
   * @returns {Object} Memory usage statistics
   */
  static getModelMemoryUsage(model) {
    const weights = model.getWeights();
    let totalBytes = 0;
    let layerStats = {};

    weights.forEach((w, i) => {
      const bytes = w.size * 4; // Float32 = 4 bytes
      totalBytes += bytes;
      layerStats[`layer_${i}`] = {
        shape: w.shape,
        bytes: bytes,
        parameters: w.size,
      };
    });

    return {
      totalBytes,
      totalMB: totalBytes / (1024 * 1024),
      layers: layerStats,
    };
  }

  /**
   * Validate model weights
   * @param {Array} weights - Model weights
   * @returns {boolean} Whether weights are valid
   */
  static validateWeights(weights) {
    return weights.every(
      w =>
        w.shape &&
        Array.isArray(w.shape) &&
        w.dtype &&
        w.data &&
        typeof w.data === 'string',
    );
  }
}

export default ModelSerializer;
