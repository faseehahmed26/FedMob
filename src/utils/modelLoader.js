import * as tf from "@tensorflow/tfjs";
import * as FileSystem from "expo-file-system";

export async function loadTrainedModel(modelName) {
  try {
    const modelDir = `${FileSystem.documentDirectory}models_file/${modelName}`;

    // Load model topology
    const modelJSON = await FileSystem.readAsStringAsync(
      `${modelDir}/model.json`
    );
    const modelTopology = JSON.parse(modelJSON);

    // Load weights
    const weightsBase64 = await FileSystem.readAsStringAsync(
      `${modelDir}/weights.bin`,
      {
        encoding: FileSystem.EncodingType.Base64,
      }
    );
    const weightData = tf.util.base642array(weightsBase64);

    // Load metadata
    const metadataJSON = await FileSystem.readAsStringAsync(
      `${modelDir}/metadata.json`
    );
    const metadata = JSON.parse(metadataJSON);

    // Create model from artifacts
    const model = await tf.loadLayersModel(
      tf.io.fromMemory({
        modelTopology,
        weightData: weightData.buffer,
      })
    );

    return { model, metadata };
  } catch (error) {
    console.error("Error loading model:", error);
    throw new Error(`Failed to load model: ${error.message}`);
  }
}
