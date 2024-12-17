import RNFS from "react-native-fs";
import * as tf from "@tensorflow/tfjs";

const BASE_PATH = `${RNFS.DocumentDirectoryPath}/models_file`;

class ModelStorage {
  async saveModel(model, modelName, metadata) {
    try {
      const modelPath = `${BASE_PATH}/${modelName}`;

      // Create directory if it doesn't exist
      await RNFS.mkdir(modelPath, { recursive: true });

      // Save model metadata
      await RNFS.writeFile(
        `${modelPath}/metadata.json`,
        JSON.stringify(
          {
            ...metadata,
            savedAt: new Date().toISOString(),
          },
          null,
          2
        ),
        "utf8"
      );

      // Save the model
      await model.save(`file://${modelPath}/model`);

      return { success: true, path: modelPath };
    } catch (error) {
      console.error("Error saving model:", error);
      throw error;
    }
  }

  async loadModel(modelName) {
    try {
      const modelPath = `${BASE_PATH}/${modelName}`;

      // Load metadata
      const metadata = JSON.parse(
        await RNFS.readFile(`${modelPath}/metadata.json`, "utf8")
      );

      // Load model
      const model = await tf.loadLayersModel(
        `file://${modelPath}/model/model.json`
      );

      return { model, metadata };
    } catch (error) {
      console.error("Error loading model:", error);
      throw error;
    }
  }

  async listModels() {
    try {
      await RNFS.mkdir(BASE_PATH, { recursive: true });
      const items = await RNFS.readDir(BASE_PATH);

      const models = [];
      for (const item of items) {
        if (item.isDirectory()) {
          try {
            const metadata = JSON.parse(
              await RNFS.readFile(`${item.path}/metadata.json`, "utf8")
            );
            models.push(metadata);
          } catch (error) {
            console.warn(`Could not read metadata for ${item.name}`);
          }
        }
      }

      return models;
    } catch (error) {
      console.error("Error listing models:", error);
      return [];
    }
  }

  async deleteModel(modelName) {
    try {
      const modelPath = `${BASE_PATH}/${modelName}`;
      await RNFS.unlink(modelPath);
      return true;
    } catch (error) {
      console.error("Error deleting model:", error);
      throw error;
    }
  }
}

export default new ModelStorage();
