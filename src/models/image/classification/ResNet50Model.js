// models/image/classification/ResNet50Model.js
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-react-native";

class ResNet50Model {
  constructor() {
    this.modelName = "resnet50";
    this.defaultConfig = {
      inputShape: [224, 224, 3],
      numClasses: null,
      learningRate: 0.0001,
      batchSize: 16,
    };
  }
  // async buildModel(numClasses) {
  //   console.log(numClasses);

  //   // Load pre-trained ResNet50 model
  //   const modelUrl =
  //     "https://storage.googleapis.com/tfjs-models/tfjs/resnet_v2_50/model.json";
  //   const baseModel = await tf.loadGraphModel(modelUrl);
  //   console.log("Loaded the base model");

  //   // Create a new sequential model
  //   const model = tf.sequential();

  //   // Add the base model as a layer
  //   model.add(
  //     tf.layers.inputLayer({ inputShape: this.defaultConfig.inputShape })
  //   );
  //   model.add(
  //     tf.layers.lambda((x) => baseModel.execute(x, "resnet_v2_50/predictions"))
  //   );

  //   // Add custom classification layers
  //   model.add(tf.layers.globalAveragePooling2d());
  //   model.add(tf.layers.dense({ units: 512, activation: "relu" }));
  //   model.add(tf.layers.dropout({ rate: 0.5 }));
  //   model.add(tf.layers.dense({ units: numClasses, activation: "softmax" }));
  //   console.log("Built the model with custom classification layers");

  //   return model;
  // }

  async buildModel(numClasses) {
    const tf = require("@tensorflow/tfjs");
    console.log(numClasses);
    // Load pre-trained ResNet50
    // const modelUrl =
    //   "https://www.kaggle.com/models/google/resnet-v2/TfJs/101-classification/2";
    const modelUrl =
      "https://storage.googleapis.com/tfjs-models/tfjs/resnet_v2_50/model.json";

    const baseModel = await tf.loadLayersModel(modelUrl, { fromTFHub: true });
    console.log("Loaded the base model layers");

    // Freeze the base model layers
    for (const layer of baseModel.layers) {
      layer.trainable = false;
    }
    console.log("Freezed the base model layers");
    // Create new model with custom classification head
    const model = tf.sequential();

    // Add the base ResNet50 model
    model.add(baseModel);
    console.log("Base Model added");
    // Add custom classification layers
    model.add(tf.layers.globalAveragePooling2d());
    model.add(tf.layers.dense({ units: 512, activation: "relu" }));
    model.add(tf.layers.dropout({ rate: 0.5 }));
    model.add(tf.layers.dense({ units: numClasses, activation: "softmax" }));
    console.log("Done with Building the Model");

    return model;
  }

  async compile(model) {
    model.compile({
      optimizer: tf.train.adam(this.defaultConfig.learningRate),
      loss: "categoricalCrossentropy",
      metrics: ["accuracy"],
    });
    return model;
  }

  getModelInfo() {
    return {
      name: this.modelName,
      description: "Transfer learning with ResNet50 for image classification",
      defaultConfig: this.defaultConfig,
    };
  }
}

export default ResNet50Model;
