import { useState, useCallback } from "react";
import { useModelContext } from "../contexts/ModelContext";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-react-native";
import { Platform, Image } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";
// import { decodeJpeg } from "@tensorflow/tfjs-react-native";
import * as FileSystem from "expo-file-system";
import { bundleResourceIO, decodeJpeg } from "@tensorflow/tfjs-react-native";
import BasicImageModel from "../models/image/classification/BasicImageModel";
import ResNet50Model from "../models/image/classification/ResNet50Model";
import { decode, encode } from "base-64";

export const useModelTraining = () => {
  const { imagesByClass, selectedModel, setTrainingProgress, setIsTraining } =
    useModelContext();
  const [currentEpoch, setCurrentEpoch] = useState(0);
  // Encodign the current epoch
  const arrayBufferToBase64 = (buffer) => {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return encode(binary);
  };
  const preprocessImage = async (imageUri) => {
    try {
      // First, ensure TensorFlow is ready
      await tf.ready();

      if (Platform.OS === "web") {
        // Web platform handling
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            const tensor = tf.browser
              .fromPixels(img)
              .resizeBilinear([224, 224])
              .toFloat()
              .div(tf.scalar(255.0))
              .expandDims(0);
            resolve(tensor);
          };
          img.onerror = (error) => reject(error);
          img.src = imageUri;
        });
      } else {
        // React Native handling
        const manipResult = await ImageManipulator.manipulateAsync(
          imageUri,
          [{ resize: { width: 224, height: 224 } }],
          { format: "jpeg", base64: true }
        );

        // Convert base64 to Uint8Array
        const imgBuffer = tf.util.encodeString(
          manipResult.base64,
          "base64"
        ).buffer;
        const raw = new Uint8Array(imgBuffer);

        // Decode and preprocess
        let imageTensor = await decodeJpeg(raw);

        // Normalize and reshape
        const processedTensor = tf.tidy(() => {
          // Add batch dimension and normalize
          return tf.expandDims(imageTensor).toFloat().div(tf.scalar(255));
        });

        // Clean up the intermediate tensor
        tf.dispose(imageTensor);

        return processedTensor;
      }
    } catch (error) {
      console.error("Error in preprocessImage:", error);
      throw error;
    }
  };

  const createDataset = async () => {
    try {
      // Ensure TensorFlow is ready
      await tf.ready();

      const classNames = Object.keys(imagesByClass);
      const numClasses = classNames.length;
      const processedImages = [];
      const labels = [];

      // Process each class
      for (let classIdx = 0; classIdx < classNames.length; classIdx++) {
        const className = classNames[classIdx];
        const images = imagesByClass[className];
        console.log(
          `Processing class ${className} with ${images.length} images`
        );

        // Process images in this class
        for (const image of images) {
          try {
            const tensor = await preprocessImage(image.uri);
            processedImages.push(tensor);

            // Create one-hot encoded label
            const label = Array(numClasses).fill(0);
            label[classIdx] = 1;
            labels.push(label);
          } catch (error) {
            console.error(
              `Failed to process image in class ${className}:`,
              error
            );
          }
        }
      }

      if (processedImages.length === 0) {
        throw new Error("No images were successfully processed");
      }

      // Create the final tensors
      const xs = tf.concat(processedImages, 0);
      const ys = tf.tensor2d(labels);

      // Clean up individual tensors
      processedImages.forEach((tensor) => tf.dispose(tensor));

      return {
        xs,
        ys,
        numClasses,
      };
    } catch (error) {
      console.error("Error creating dataset:", error);
      throw error;
    }
  };

  const trainModel = useCallback(
    async (modelConfig) => {
      try {
        setIsTraining(true);

        // Initialize TensorFlow
        await tf.ready();
        console.log("TensorFlow.js ready");

        const { epochs, batchSize, learningRate, modelName, validationSplit } =
          modelConfig;

        // Create dataset
        const { xs, ys, numClasses } = await createDataset();
        console.log("Dataset created successfully");

        // Get model instance
        const ModelClass =
          selectedModel === "basic" ? BasicImageModel : ResNet50Model;
        const model = new ModelClass();
        console.log(model);
        // Build and compile model
        const tfModel = await model.buildModel(numClasses);
        console.log(tfModel);
        tfModel.compile({
          optimizer: tf.train.adam(learningRate),
          loss: "categoricalCrossentropy",
          metrics: ["accuracy"],
        });
        console.log("Training Input:", { xs, ys });

        // // Train model
        // await tfModel.fit(xs, ys, {
        //   epochs,
        //   batchSize,
        //   validationSplit,
        //   shuffle: true,
        //   callbacks: {
        //     onEpochEnd: (epoch, logs) => {
        //       setTrainingProgress({
        //         epoch: epoch + 1,
        //         loss: logs.loss,
        //         accuracy: logs.acc,
        //         progress: ((epoch + 1) / epochs) * 100,
        //       });
        //     },
        //   },
        // });
        // Train model
        const trainResult = await tfModel.fit(xs, ys, {
          epochs,
          batchSize,
          validationSplit,
          shuffle: true,
          callbacks: {
            onEpochEnd: (epoch, logs) => {
              setTrainingProgress({
                epoch: epoch + 1,
                loss: logs.loss,
                accuracy: logs.acc,
                progress: ((epoch + 1) / epochs) * 100,
              });
            },
          },
        });
        // Save model
        if (Platform.OS !== "web") {
          try {
            // Create the directory structure
            const modelDir = `${FileSystem.documentDirectory}/models_file/${modelName}`;
            await FileSystem.makeDirectoryAsync(modelDir, {
              intermediates: true,
            });

            // Get model artifacts
            const saveResult = await tfModel.save(
              tf.io.withSaveHandler(async (artifacts) => {
                try {
                  // Save model topology
                  const modelTopologyPath = `${modelDir}/model-topology.json`;
                  await FileSystem.writeAsStringAsync(
                    modelTopologyPath,
                    JSON.stringify(artifacts.modelTopology)
                  );

                  // Save weights manifest
                  const weightsManifestPath = `${modelDir}/weights-manifest.json`;
                  await FileSystem.writeAsStringAsync(
                    weightsManifestPath,
                    JSON.stringify(artifacts.weightSpecs)
                  );

                  // Save weights data
                  const weightsDataPath = `${modelDir}/weights-data.bin`;
                  const weightsBase64 = arrayBufferToBase64(
                    artifacts.weightData
                  );
                  await FileSystem.writeAsStringAsync(
                    weightsDataPath,
                    weightsBase64,
                    { encoding: FileSystem.EncodingType.Base64 }
                  );

                  // Save metadata
                  const metadata = {
                    name: modelName,
                    type: selectedModel,
                    numClasses,
                    trainedAt: new Date().toISOString(),
                    performance: {
                      finalLoss:
                        trainResult.history.loss[
                          trainResult.history.loss.length - 1
                        ],
                      finalAccuracy:
                        trainResult.history.acc[
                          trainResult.history.acc.length - 1
                        ],
                    },
                    config: modelConfig,
                  };

                  await FileSystem.writeAsStringAsync(
                    `${modelDir}/metadata.json`,
                    JSON.stringify(metadata, null, 2)
                  );

                  return {
                    modelArtifactsInfo: {
                      dateSaved: new Date(),
                      modelTopologyType: "JSON",
                    },
                  };
                } catch (error) {
                  console.error("Error in save handler:", error);
                  throw error;
                }
              })
            );

            console.log("Model saved successfully:", saveResult);
          } catch (saveError) {
            console.error("Error saving model:", saveError);
            throw new Error(`Failed to save model: ${saveError.message}`);
          }
        }

        setIsTraining(false);
        return { success: true };
      } catch (error) {
        console.error("Training error:", error);
        setIsTraining(false);
        throw error;
      }
    },
    [imagesByClass, selectedModel, setTrainingProgress, setIsTraining]
  );

  return {
    trainModel,
    currentEpoch,
  };
};
