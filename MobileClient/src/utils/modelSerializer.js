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
    console.log(`[MODEL SERIALIZER] Serializing ${weights.length} weight layers`);
    
    const serialized = weights.map((w, i) => {
      const shape = Array.from(w.shape);
      console.log(`[MODEL SERIALIZER] Layer ${i}: shape=[${shape.join(', ')}], size=${w.size}`);
      return {
        shape,
        dtype: w.dtype,
        data: this.tensorToBase64(w),
      };
    });
    
    console.log(`[MODEL SERIALIZER] Serialized ${serialized.length} weight layers`);
    return serialized;
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
    console.log(`[MODEL SERIALIZER] Updating model with ${serializedWeights.length} weight layers`);
    
    // Get current model weights to validate shapes match
    const currentWeights = model.getWeights();
    if (currentWeights.length !== serializedWeights.length) {
      throw new Error(
        `Weight count mismatch: model has ${currentWeights.length} layers, received ${serializedWeights.length}`
      );
    }
    
    // Create weight tensors
    const weights = serializedWeights.map((w, i) => {
      const shape = w.shape;
      const expectedShape = currentWeights[i].shape;
      
      // Validate shape matches
      if (shape.length !== expectedShape.length || 
          !shape.every((dim, idx) => dim === expectedShape[idx])) {
        console.warn(
          `[MODEL SERIALIZER] Layer ${i} shape mismatch: expected [${expectedShape.join(', ')}], got [${shape.join(', ')}]`
        );
      } else {
        console.log(`[MODEL SERIALIZER] Layer ${i}: shape=[${shape.join(', ')}] ✓`);
      }
      
      return tf.tensor(this.base64ToFloat32Array(w.data), w.shape, w.dtype);
    });

    // Set weights - TensorFlow.js takes ownership, but we dispose to be safe on React Native
    model.setWeights(weights);
    
    // Dispose temporary tensors after setWeights() completes
    // Note: setWeights() takes ownership, but disposing here ensures proper cleanup on React Native
    weights.forEach(tensor => {
      if (tensor && typeof tensor.dispose === 'function') {
        try {
          // Check if tensor is already disposed to avoid errors
          if (!tensor.isDisposed) {
            tensor.dispose();
          }
        } catch (e) {
          // Ignore disposal errors (tensor might already be disposed by setWeights)
          console.warn(`[MODEL SERIALIZER] Warning during tensor disposal: ${e.message}`);
        }
      }
    });
    
    console.log(`[MODEL SERIALIZER] Successfully updated model weights`);
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
