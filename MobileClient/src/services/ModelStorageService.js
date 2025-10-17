/**
 * Model Storage Service for FedMob
 * Handles saving and loading trained models to/from file system
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

class ModelStorageService {
  constructor() {
    this.STORAGE_KEY_PREFIX = 'fedmob_model_';
    this.MODELS_LIST_KEY = 'fedmob_models_list';
    this.MODELS_DIR = `${FileSystem.documentDirectory}fedmob_models`;
    this.initializeDirectory();
  }

  /**
   * Initialize models directory
   */
  async initializeDirectory() {
    try {
      const info = await FileSystem.getInfoAsync(this.MODELS_DIR);
      if (!info.exists) {
        await FileSystem.makeDirectoryAsync(this.MODELS_DIR, {
          intermediates: true,
        });
        console.log('Created models directory:', this.MODELS_DIR);
      }
    } catch (error) {
      console.error('Failed to initialize models directory:', error);
    }
  }

  /**
   * Save a trained model to file system
   * @param {Object} modelData - Model data including weights and metrics
   * @param {string} modelData.name - Model name
   * @param {Array} modelData.weights - Model weights as arrays
   * @param {Object} modelData.metrics - Training metrics
   * @returns {Promise<string>} Model ID
   */
  async saveModel(modelData) {
    try {
      const timestamp = Date.now();
      const modelId = `${this.STORAGE_KEY_PREFIX}${timestamp}`;
      const modelFilePath = `${this.MODELS_DIR}/${modelId}.json`;

      // Create model metadata (without weights for metadata)
      const modelMetadata = {
        id: modelId,
        name: modelData.name || `FL Model ${new Date().toLocaleDateString()}`,
        timestamp: timestamp,
        metrics: modelData.metrics || {},
        createdAt: new Date().toISOString(),
        filePath: modelFilePath,
      };

      // Save full model data to file system
      const fullModelData = {
        ...modelMetadata,
        weights: modelData.weights,
      };

      // Write to file system
      await FileSystem.writeAsStringAsync(
        modelFilePath,
        JSON.stringify(fullModelData),
        { encoding: FileSystem.EncodingType.UTF8 },
      );

      // Save only metadata to AsyncStorage for quick access
      await AsyncStorage.setItem(modelId, JSON.stringify(modelMetadata));

      // Update models list
      await this.addToModelsList(modelId);

      console.log(`Model saved with ID: ${modelId} to file: ${modelFilePath}`);
      return modelId;
    } catch (error) {
      console.error('Failed to save model:', error);
      throw error;
    }
  }

  /**
   * Load a specific model by ID
   * @param {string} modelId - Model ID
   * @returns {Promise<Object>} Model data
   */
  async loadModel(modelId) {
    try {
      // First try to get metadata from AsyncStorage
      const metadata = await AsyncStorage.getItem(modelId);
      if (!metadata) {
        throw new Error(`Model with ID ${modelId} not found`);
      }

      const modelMetadata = JSON.parse(metadata);

      // If file path exists, load from file system
      if (modelMetadata.filePath) {
        const info = await FileSystem.getInfoAsync(modelMetadata.filePath);
        if (info.exists) {
          const fileData = await FileSystem.readAsStringAsync(
            modelMetadata.filePath,
            { encoding: FileSystem.EncodingType.UTF8 },
          );
          return JSON.parse(fileData);
        }
      }

      // Fallback to AsyncStorage if file doesn't exist
      return modelMetadata;
    } catch (error) {
      console.error('Failed to load model:', error);
      throw error;
    }
  }

  /**
   * Get all saved models (metadata only)
   * @returns {Promise<Array>} List of model metadata
   */
  async getAllModels() {
    try {
      let modelsList = await AsyncStorage.getItem(this.MODELS_LIST_KEY);
      let modelIds = modelsList ? JSON.parse(modelsList) : [];

      // Fallback: reconstruct list from keys if empty
      if (!modelIds.length) {
        const allKeys = await AsyncStorage.getAllKeys();
        modelIds = allKeys.filter(k => k.startsWith(this.STORAGE_KEY_PREFIX));
        if (modelIds.length) {
          await AsyncStorage.setItem(
            this.MODELS_LIST_KEY,
            JSON.stringify(modelIds),
          );
        }
      }
      const models = [];

      for (const modelId of modelIds) {
        try {
          const modelData = await this.loadModel(modelId);
          // Return only metadata, not the full weights
          models.push({
            id: modelData.id,
            name: modelData.name,
            timestamp: modelData.timestamp,
            createdAt: modelData.createdAt,
            metrics: modelData.metrics,
          });
        } catch (error) {
          console.warn(`Failed to load model ${modelId}:`, error);
          // Remove invalid model from list
          await this.removeFromModelsList(modelId);
        }
      }

      // Sort by timestamp (newest first)
      return models.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Failed to get all models:', error);
      return [];
    }
  }

  /**
   * Delete a model
   * @param {string} modelId - Model ID to delete
   * @returns {Promise<boolean>} Success status
   */
  async deleteModel(modelId) {
    try {
      // Get metadata to find file path
      const metadata = await AsyncStorage.getItem(modelId);
      if (metadata) {
        const modelMetadata = JSON.parse(metadata);

        // Delete file if it exists
        if (modelMetadata.filePath) {
          const info = await FileSystem.getInfoAsync(modelMetadata.filePath);
          if (info.exists) {
            await FileSystem.deleteAsync(modelMetadata.filePath, {
              idempotent: true,
            });
            console.log(`Deleted model file: ${modelMetadata.filePath}`);
          }
        }
      }

      // Remove from AsyncStorage
      await AsyncStorage.removeItem(modelId);
      await this.removeFromModelsList(modelId);
      console.log(`Model ${modelId} deleted`);
      return true;
    } catch (error) {
      console.error('Failed to delete model:', error);
      return false;
    }
  }

  /**
   * Get model storage size info
   * @returns {Promise<Object>} Storage statistics
   */
  async getStorageInfo() {
    try {
      const models = await this.getAllModels();
      const totalModels = models.length;

      // Calculate approximate storage size
      let totalSize = 0;
      for (const model of models) {
        try {
          const fullModel = await this.loadModel(model.id);
          const modelSize = JSON.stringify(fullModel).length;
          totalSize += modelSize;
        } catch (error) {
          console.warn(`Failed to calculate size for model ${model.id}`);
        }
      }

      return {
        totalModels,
        totalSizeBytes: totalSize,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return { totalModels: 0, totalSizeBytes: 0, totalSizeMB: '0.00' };
    }
  }

  /**
   * Clear all saved models
   * @returns {Promise<boolean>} Success status
   */
  async clearAllModels() {
    try {
      const models = await this.getAllModels();

      // Delete all model files
      for (const model of models) {
        if (model.filePath) {
          const info = await FileSystem.getInfoAsync(model.filePath);
          if (info.exists) {
            await FileSystem.deleteAsync(model.filePath, { idempotent: true });
          }
        }
        await AsyncStorage.removeItem(model.id);
      }

      // Clear models directory contents
      const dirInfo = await FileSystem.getInfoAsync(this.MODELS_DIR);
      if (dirInfo.exists) {
        const files = await FileSystem.readDirectoryAsync(this.MODELS_DIR);
        await Promise.all(
          files.map(name =>
            FileSystem.deleteAsync(`${this.MODELS_DIR}/${name}`, {
              idempotent: true,
            }),
          ),
        );
      }

      await AsyncStorage.removeItem(this.MODELS_LIST_KEY);
      console.log('All models cleared');
      return true;
    } catch (error) {
      console.error('Failed to clear all models:', error);
      return false;
    }
  }

  /**
   * Add model ID to the models list
   * @private
   */
  async addToModelsList(modelId) {
    try {
      const existingList = await AsyncStorage.getItem(this.MODELS_LIST_KEY);
      const modelIds = existingList ? JSON.parse(existingList) : [];

      if (!modelIds.includes(modelId)) {
        modelIds.push(modelId);
        await AsyncStorage.setItem(
          this.MODELS_LIST_KEY,
          JSON.stringify(modelIds),
        );
      }
    } catch (error) {
      console.error('Failed to add to models list:', error);
    }
  }

  /**
   * Remove model ID from the models list
   * @private
   */
  async removeFromModelsList(modelId) {
    try {
      const existingList = await AsyncStorage.getItem(this.MODELS_LIST_KEY);
      if (existingList) {
        const modelIds = JSON.parse(existingList);
        const updatedIds = modelIds.filter(id => id !== modelId);
        await AsyncStorage.setItem(
          this.MODELS_LIST_KEY,
          JSON.stringify(updatedIds),
        );
      }
    } catch (error) {
      console.error('Failed to remove from models list:', error);
    }
  }

  /**
   * Export model data for sharing
   * @param {string} modelId - Model ID to export
   * @returns {Promise<Object>} Exportable model data
   */
  async exportModel(modelId) {
    try {
      const modelData = await this.loadModel(modelId);

      return {
        id: modelData.id,
        name: modelData.name,
        timestamp: modelData.timestamp,
        weights: modelData.weights,
        metrics: modelData.metrics,
        exportedAt: new Date().toISOString(),
        version: '1.0',
      };
    } catch (error) {
      console.error('Failed to export model:', error);
      throw error;
    }
  }

  /**
   * Import model data
   * @param {Object} modelData - Model data to import
   * @returns {Promise<string>} New model ID
   */
  async importModel(modelData) {
    try {
      const timestamp = Date.now();
      const modelId = `${this.STORAGE_KEY_PREFIX}${timestamp}`;

      const modelToSave = {
        id: modelId,
        name:
          modelData.name || `Imported Model ${new Date().toLocaleDateString()}`,
        timestamp: timestamp,
        weights: modelData.weights,
        metrics: modelData.metrics || {},
        createdAt: new Date().toISOString(),
        imported: true,
      };

      await AsyncStorage.setItem(modelId, JSON.stringify(modelToSave));
      await this.addToModelsList(modelId);

      console.log(`Model imported with ID: ${modelId}`);
      return modelId;
    } catch (error) {
      console.error('Failed to import model:', error);
      throw error;
    }
  }
}

export default new ModelStorageService();
