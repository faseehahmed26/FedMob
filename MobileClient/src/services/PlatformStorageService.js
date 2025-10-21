import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

class PlatformStorageService {
  constructor() {
    this.isWeb = Platform.OS === 'web';
    this.webCache = new Map(); // In-memory cache for web
  }

  async saveModel(modelData) {
    if (this.isWeb) {
      return this.saveModelWeb(modelData);
    } else {
      return this.saveModelMobile(modelData);
    }
  }

  async loadModel(modelId) {
    if (this.isWeb) {
      return this.loadModelWeb(modelId);
    } else {
      return this.loadModelMobile(modelId);
    }
  }

  async deleteModel(modelId) {
    if (this.isWeb) {
      return this.deleteModelWeb(modelId);
    } else {
      return this.deleteModelMobile(modelId);
    }
  }

  async listModels() {
    if (this.isWeb) {
      return this.listModelsWeb();
    } else {
      return this.listModelsMobile();
    }
  }

  async getStorageInfo() {
    if (this.isWeb) {
      return this.getStorageInfoWeb();
    } else {
      return this.getStorageInfoMobile();
    }
  }

  async getStorageInfoWeb() {
    try {
      const models = this.getStoredModels();
      const totalSizeBytes = Object.values(models).reduce((total, model) => {
        return total + JSON.stringify(model).length;
      }, 0);

      return {
        totalModels: Object.keys(models).length,
        totalSizeBytes: totalSizeBytes,
        totalSizeMB: (totalSizeBytes / 1024 / 1024).toFixed(2),
      };
    } catch (error) {
      console.error('Failed to get web storage info:', error);
      return { totalModels: 0, totalSizeBytes: 0, totalSizeMB: '0.00' };
    }
  }

  async getStorageInfoMobile() {
    try {
      const models = await this.listModelsMobile();
      const totalSizeBytes = this._totalSizeBytes || 0;

      return {
        totalModels: models.length,
        totalSizeBytes: totalSizeBytes,
        totalSizeMB: (totalSizeBytes / 1024 / 1024).toFixed(2),
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return { totalModels: 0, totalSizeBytes: 0, totalSizeMB: '0.00' };
    }
  }

  // Web storage methods (using in-memory cache)
  async saveModelWeb(modelData) {
    try {
      const modelId = modelData.id || `model_${Date.now()}`;
      this.webCache.set(modelId, {
        ...modelData,
        id: modelId,
        savedAt: new Date().toISOString(),
      });

      // Also save to localStorage as backup
      const models = this.getStoredModels();
      models[modelId] = this.webCache.get(modelId);
      localStorage.setItem('fedmob_models', JSON.stringify(models));

      console.log(`Model saved to web cache: ${modelId}`);
      return modelId;
    } catch (error) {
      console.error('Failed to save model to web cache:', error);
      throw error;
    }
  }

  async loadModelWeb(modelId) {
    try {
      // Try cache first
      if (this.webCache.has(modelId)) {
        return this.webCache.get(modelId);
      }

      // Try localStorage
      const models = this.getStoredModels();
      if (models[modelId]) {
        this.webCache.set(modelId, models[modelId]);
        return models[modelId];
      }

      throw new Error(`Model not found: ${modelId}`);
    } catch (error) {
      console.error('Failed to load model from web cache:', error);
      throw error;
    }
  }

  async deleteModelWeb(modelId) {
    try {
      this.webCache.delete(modelId);

      // Also remove from localStorage
      const models = this.getStoredModels();
      delete models[modelId];
      localStorage.setItem('fedmob_models', JSON.stringify(models));

      console.log(`Model deleted from web cache: ${modelId}`);
    } catch (error) {
      console.error('Failed to delete model from web cache:', error);
      throw error;
    }
  }

  async listModelsWeb() {
    try {
      const models = this.getStoredModels();
      return Object.values(models).map(model => ({
        id: model.id,
        name: model.name,
        timestamp: model.savedAt, // Map savedAt to timestamp for compatibility
        savedAt: model.savedAt,
        accuracy: model.accuracy,
        round: model.round,
        metrics: model.metrics, // Include metrics if available
      }));
    } catch (error) {
      console.error('Failed to list models from web cache:', error);
      return [];
    }
  }

  getStoredModels() {
    try {
      const stored = localStorage.getItem('fedmob_models');
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.warn('Failed to parse stored models:', error);
      return {};
    }
  }

  // Mobile storage methods (using expo-file-system)
  async saveModelMobile(modelData) {
    try {
      const modelId = modelData.id || `model_${Date.now()}`;
      const fileName = `model_${modelId}.json`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      const modelToSave = {
        ...modelData,
        id: modelId,
        savedAt: new Date().toISOString(),
      };

      await FileSystem.writeAsStringAsync(
        fileUri,
        JSON.stringify(modelToSave, null, 2),
      );

      console.log(`Model saved to mobile storage: ${modelId}`);
      return modelId;
    } catch (error) {
      console.error('Failed to save model to mobile storage:', error);
      throw error;
    }
  }

  async loadModelMobile(modelId) {
    try {
      const fileName = `model_${modelId}.json`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        throw new Error(`Model file not found: ${modelId}`);
      }

      const modelData = await FileSystem.readAsStringAsync(fileUri);
      return JSON.parse(modelData);
    } catch (error) {
      console.error('Failed to load model from mobile storage:', error);
      throw error;
    }
  }

  async deleteModelMobile(modelId) {
    try {
      const fileName = `model_${modelId}.json`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(fileUri);
        console.log(`Model deleted from mobile storage: ${modelId}`);
      }
    } catch (error) {
      console.error('Failed to delete model from mobile storage:', error);
      throw error;
    }
  }

  async listModelsMobile() {
    try {
      const files = await FileSystem.readDirectoryAsync(
        FileSystem.documentDirectory,
      );
      const modelFiles = files.filter(
        file => file.startsWith('model_') && file.endsWith('.json'),
      );

      const models = [];
      let totalSizeBytes = 0;

      for (const file of modelFiles) {
        try {
          const fileUri = `${FileSystem.documentDirectory}${file}`;
          const fileInfo = await FileSystem.getInfoAsync(fileUri);
          const modelData = await FileSystem.readAsStringAsync(fileUri);
          const model = JSON.parse(modelData);

          // Calculate file size
          const fileSize = fileInfo.size || modelData.length;
          totalSizeBytes += fileSize;

          models.push({
            id: model.id,
            name: model.name,
            timestamp: model.savedAt, // Map savedAt to timestamp for compatibility
            savedAt: model.savedAt,
            accuracy: model.accuracy,
            round: model.round,
            metrics: model.metrics, // Include metrics if available
            size: fileSize,
          });
        } catch (error) {
          console.warn(`Failed to parse model file ${file}:`, error);
        }
      }

      // Store total size for getStorageInfo
      this._totalSizeBytes = totalSizeBytes;

      return models.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
    } catch (error) {
      console.error('Failed to list models from mobile storage:', error);
      return [];
    }
  }
}

export default new PlatformStorageService();
